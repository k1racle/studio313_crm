from rest_framework import serializers
from .models import KnowledgeCategory, KnowledgeItem, Slide


class KnowledgeCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = KnowledgeCategory
        fields = ['id', 'name', 'order']


class SlideSerializer(serializers.ModelSerializer):
    image_url = serializers.ImageField(source='image', read_only=True)
    item = serializers.PrimaryKeyRelatedField(queryset=KnowledgeItem.objects.all(), write_only=True)

    class Meta:
        model = Slide
        fields = ['id', 'item', 'image', 'image_url', 'caption', 'order']


class KnowledgeItemListSerializer(serializers.ModelSerializer):
    category = KnowledgeCategorySerializer(read_only=True)
    category_id = serializers.PrimaryKeyRelatedField(
        source='category',
        queryset=KnowledgeCategory.objects.all(),
        required=False,
        allow_null=True,
        write_only=True,
    )

    class Meta:
        model = KnowledgeItem
        fields = [
            'id', 'title', 'description', 'kind', 'category',
            'category_id', 'is_published', 'order', 'created_at', 'updated_at',
        ]


class KnowledgeItemDetailSerializer(serializers.ModelSerializer):
    category = KnowledgeCategorySerializer(read_only=True)
    category_id = serializers.PrimaryKeyRelatedField(
        source='category',
        queryset=KnowledgeCategory.objects.all(),
        required=False,
        allow_null=True,
        write_only=True,
    )
    slides = SlideSerializer(many=True, read_only=True)

    class Meta:
        model = KnowledgeItem
        fields = [
            'id', 'title', 'description', 'kind', 'text_content', 'video_url',
            'category', 'category_id', 'slides', 'is_published', 'order',
            'created_at', 'updated_at',
        ]
