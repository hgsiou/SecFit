from django.core.mail import send_mail
from django.conf import settings


def sendNotification(recipientList):
    for recipient in recipientList:
        print("Skal egentlig sende mail til", recipient, "om at coach har lagt ut en trening til han")