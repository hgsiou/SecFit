from django.test import TestCase
from users.serializers import UserSerializer

# Create your tests here.


class UserSerializerTestCase(TestCase):
    def setUp(self):
        self.ser = UserSerializer()

    def test_dummy(self):
        self.assertTrue(self.ser is not None)
