from rest_framework import generics, filters
from .models import Client
from .serializers import ClientSerializer, ClientDetailSerializer
from apps.users.permissions import IsManagerOrHigher


class ClientListCreateView(generics.ListCreateAPIView):
    serializer_class = ClientSerializer
    permission_classes = [IsManagerOrHigher]
    filter_backends = [filters.SearchFilter]
    search_fields = ['name', 'phone', 'email', 'telegram']
    pagination_class = None

    def get_queryset(self):
        qs = Client.objects.all()
        if self.request.query_params.get('archived') != '1':
            qs = qs.filter(is_archived=False)
        return qs


class ClientDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Client.objects.all()
    serializer_class = ClientDetailSerializer
    permission_classes = [IsManagerOrHigher]
