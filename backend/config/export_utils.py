def filter_queryset_from_view(request, view_cls, *view_args, **view_kwargs):
    """Создаёт экземпляр спискового view и применяет к нему get_queryset + filter_queryset."""
    view = view_cls(*view_args, **view_kwargs)
    view.request = request
    view.args = ()
    view.kwargs = {}
    return view.filter_queryset(view.get_queryset())
