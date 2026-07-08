"""
Патч для httpcore: при использовании SOCKS5-прокси разрешает имя цели
локально и отправляет прокси только IPv4-адрес.

Проблема: httpx/httpcore для SOCKS5 всегда передаёт прокси доменное имя
(remote DNS). Наш прокси при remote DNS выбирает IPv6-путь к Telegram/MAX,
который почему-то не проходит (ConnectTimeout). При локальном разрешении
IPv4 всё работает (проверено через `curl --socks5`).

Патч применяется глобально для всех SOCKS5-соединений в процессе.
"""

import asyncio
import socket
import logging

logger = logging.getLogger(__name__)


def _is_ip_address(host: str) -> bool:
    try:
        socket.inet_pton(socket.AF_INET, host)
        return True
    except OSError:
        pass
    try:
        socket.inet_pton(socket.AF_INET6, host)
        return True
    except OSError:
        pass
    return False


def _resolve_ipv4(host: str, port: int) -> str:
    """Возвращает IPv4-адрес для хоста. Если host уже IP — не меняет."""
    if _is_ip_address(host):
        return host

    infos = socket.getaddrinfo(
        host, port, socket.AF_INET, socket.SOCK_STREAM
    )
    if not infos:
        raise OSError(f"Не удалось разрешить {host} в IPv4")
    return infos[0][4][0]


def _patch_async():
    try:
        from httpcore._async import socks_proxy as _async_socks
    except Exception as exc:  # pragma: no cover
        logger.debug("Не удалось импортировать httpcore._async.socks_proxy: %s", exc)
        return

    _orig = _async_socks._init_socks5_connection

    async def _patched(stream, *, host, port, auth=None):
        host_str = host.decode("ascii") if isinstance(host, bytes) else host
        loop = asyncio.get_running_loop()
        ipv4_host = await loop.run_in_executor(
            None, _resolve_ipv4, host_str, port
        )
        new_host = ipv4_host.encode("ascii")
        return await _orig(stream, host=new_host, port=port, auth=auth)

    _async_socks._init_socks5_connection = _patched


def _patch_sync():
    try:
        from httpcore._sync import socks_proxy as _sync_socks
    except Exception as exc:  # pragma: no cover
        logger.debug("Не удалось импортировать httpcore._sync.socks_proxy: %s", exc)
        return

    _orig = _sync_socks._init_socks5_connection

    def _patched(stream, *, host, port, auth=None):
        host_str = host.decode("ascii") if isinstance(host, bytes) else host
        ipv4_host = _resolve_ipv4(host_str, port)
        new_host = ipv4_host.encode("ascii")
        return _orig(stream, host=new_host, port=port, auth=auth)

    _sync_socks._init_socks5_connection = _patched


def apply():
    _patch_async()
    _patch_sync()
    logger.info("SOCKS5 IPv4-only patch применён")


apply()
