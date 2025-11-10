{
// "clientSubmissionId": "7c3f2a76-3a2b-4d8a-9cfc-0b5f2d6e9abc",
// Make some changes in order to match schema posgresql
// customerId -> user_id
// recordedAt -> reading_date
// currentReading -> reading_value
// url -> image_url

"customerId": "f3912e8a-1f2b-4b6c-8e34-123456789abc",
"billId": "b5a2fa3f-8c9d-11eb-8dcd-0242ac130003",
"meterId": "MTR-00123",
"currentReading": 1245,
"previousReading": 1200,
"readingUnit": "m3",
"recordedAt": "2025-11-03T14:12:00Z",
"notes": "Routine monthly reading.",
"location": {
"latitude": 14.5995,
"longitude": 120.9842,
"accuracy": 6.5,
"provider": "gps"
},
"device": {
"deviceId": "device-abc-123",
"deviceModel": "Pixel 7",
"os": "Android 13",
"appVersion": "1.2.3"
},
"photos": [
{
"url": "https://res.cloudinary.com/<cloud_name>/image/upload/v1699000000/meter_photos/mtr-00123_1.jpg",
"publicId": "meter_photos/mtr-00123_1",
"resourceType": "image",
"format": "jpg",
"width": 2048,
"height": 1536,
"bytes": 241324,
"createdAt": "2025-11-03T14:10:10Z",
"version": 1699000000,
"semanticLabel": "meter close-up",
"isPrimary": true
}
],
"source": "mobile_app"
}