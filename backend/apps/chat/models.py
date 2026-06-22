from django.db import models
from django.contrib.auth import get_user_model

User = get_user_model()


class Chat(models.Model):
    TYPE_DIRECT = 'direct'
    TYPE_GROUP = 'group'
    TYPE_CHOICES = [
        (TYPE_DIRECT, 'Личный'),
        (TYPE_GROUP, 'Групповой'),
    ]

    type = models.CharField(max_length=10, choices=TYPE_CHOICES, default=TYPE_DIRECT)
    name = models.CharField(max_length=255, blank=True)
    members = models.ManyToManyField(User, related_name='chats', blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-updated_at']
        verbose_name = 'Чат'
        verbose_name_plural = 'Чаты'

    def __str__(self):
        if self.name:
            return self.name
        names = [u.first_name or u.username for u in self.members.all()]
        return ', '.join(names) or 'Чат'

    @property
    def display_name(self):
        if self.name:
            return self.name
        names = [u.first_name or u.username for u in self.members.all()]
        return ', '.join(names) or 'Чат'


class Sticker(models.Model):
    name = models.CharField(max_length=100)
    image = models.ImageField(upload_to='stickers/')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['name']
        verbose_name = 'Стикер'
        verbose_name_plural = 'Стикеры'

    def __str__(self):
        return self.name


class Message(models.Model):
    chat = models.ForeignKey(Chat, related_name='messages', on_delete=models.CASCADE)
    sender = models.ForeignKey(User, related_name='messages', on_delete=models.CASCADE)
    text = models.TextField(blank=True)
    sticker = models.ForeignKey(Sticker, null=True, blank=True, on_delete=models.SET_NULL)
    file = models.FileField(upload_to='chat_files/%Y/%m/', blank=True, null=True)
    voice = models.FileField(upload_to='chat_voice/%Y/%m/', blank=True, null=True)
    transcription = models.TextField(blank=True)
    reply_to = models.ForeignKey('self', null=True, blank=True, on_delete=models.SET_NULL, related_name='replies')
    read_by = models.ManyToManyField(User, related_name='read_messages', blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['created_at']
        verbose_name = 'Сообщение'
        verbose_name_plural = 'Сообщения'

    def __str__(self):
        return f'#{self.id} в {self.chat}'

    def mark_read_by(self, user):
        if user != self.sender and not self.read_by.filter(id=user.id).exists():
            self.read_by.add(user)


