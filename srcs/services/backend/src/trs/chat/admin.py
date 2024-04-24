from django.contrib import admin
from .models import Message, BlackList
# Register your models here.
class MessageAdmin(admin.ModelAdmin):
    readonly_fields = ('timestamp',)

admin.site.register(Message, MessageAdmin)
admin.site.register(BlackList)