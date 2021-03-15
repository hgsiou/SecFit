from rest_framework import serializers
from django.contrib.auth import get_user_model, password_validation
from users.models import Offer, AthleteFile
from django import forms


class UserSerializer(serializers.HyperlinkedModelSerializer):
    password = serializers.CharField(style={"input_type": "password"}, write_only=True)
    password1 = serializers.CharField(style={"input_type": "password"}, write_only=True)

    class Meta:
        model = get_user_model()
        fields = [
            "url",
            "id",
            "email",
            "username",
            "password",
            "password1",
            "athletes",
            "phone_number",
            "country",
            "city",
            "street_address",
            "coach",
            "workouts",
            "coach_files",
            "athlete_files",
            "favourite_exercise"
        ]

    def validate_password(self, value):
        data = self.get_initial()

        password = data.get("password")
        password1 = data.get("password1")

        try:
            password_validation.validate_password(password)
        except forms.ValidationError as error:
            raise serializers.ValidationError(error.messages)

        return value

    def create(self, validated_data):
        username = validated_data["username"]
        email = validated_data["email"]
        password = validated_data["password"]
        phone_number = validated_data["phone_number"]
        country = validated_data["country"]
        city = validated_data["city"]
        street_address = validated_data["street_address"]
        favourite_exercise = validated_data["favourite_exercise"]
        
        user_obj = get_user_model()(username=username, email=email, phone_number=phone_number, country=country, city=city, street_address=street_address, favourite_exercise=favourite_exercise)
        user_obj.set_password(password)
        user_obj.save()

        return user_obj


class UserGetSerializer(serializers.HyperlinkedModelSerializer):
    class Meta:
        model = get_user_model()
        fields = [
            "url",
            "id",
            "email",
            "username",
            "athletes",
            "phone_number",
            "country",
            "city",
            "street_address",
            "coach",
            "workouts",
            "coach_files",
            "athlete_files",
            "favourite_exercise"
        ]


class UserPutSerializer(serializers.ModelSerializer):
    class Meta:
        model = get_user_model()
        fields = ["athletes", "favourite_exercise"]

    def update(self, instance, validated_data):
        athletes_data = validated_data["athletes"]
        favourite_exercise_data = validated_data["favourite_exercise"]

        instance.athletes.set(athletes_data)
        
        instance.favourite_exercise = favourite_exercise_data
        instance.save()

        return instance


class AthleteFileSerializer(serializers.HyperlinkedModelSerializer):
    owner = serializers.ReadOnlyField(source="owner.username")

    class Meta:
        model = AthleteFile
        fields = ["url", "id", "owner", "file", "athlete"]

    def create(self, validated_data):
        return AthleteFile.objects.create(**validated_data)


class OfferSerializer(serializers.HyperlinkedModelSerializer):
    owner = serializers.ReadOnlyField(source="owner.username")

    class Meta:
        model = Offer
        fields = [
            "url",
            "id",
            "owner",
            "recipient",
            "status",
            "timestamp",
        ]
