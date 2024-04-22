from django.core.serializers.json import Serializer
from rest_framework import serializers
from chat.models import BlackList
from django.utils.html import escape

JSON_ALLOWED_OBJECTS = (dict, list, tuple, str, int, bool)


class CustomSerializer(Serializer):
    def end_object(self, obj):
        for field in self.selected_fields:
            if field == 'pk':
                continue
            elif field in self._current.keys():
                continue
            else:
                try:
                    if '__' in field:
                        fields = field.split('__')
                        value = obj
                        for f in fields:
                            value = getattr(value, f)
                        if value != obj and isinstance(value, JSON_ALLOWED_OBJECTS) or value == None:
                            self._current[field] = escape(value)

                except AttributeError:
                    pass
        super(CustomSerializer, self).end_object(obj)

class BlackListSerializer(serializers.ModelSerializer):
    class Meta:
        model = BlackList
        fields = '__all__'