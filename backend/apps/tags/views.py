from rest_framework import generics, permissions
from .models import Tag
from .serializers import TagSerializer
from apps.users.permissions import IsManagerOrHigher


class TagListCreateView(generics.ListCreateAPIView):
    queryset = Tag.objects.all()
    serializer_class = TagSerializer

    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsManagerOrHigher()]
        return [permissions.IsAuthenticated()]


class TagDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Tag.objects.all()
    serializer_class = TagSerializer
    permission_classes = [IsManagerOrHigher]
