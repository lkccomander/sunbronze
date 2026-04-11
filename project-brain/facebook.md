- Here Facebook documentation

Example

curl -i -X POST `
  https://graph.facebook.com/v25.0/982717358267282/messages `
  -H 'Authorization: Bearer EAAYGF3c9p5IBRCZBfwvZCgmtxe6tRniavvc4IDHFQoc9qQH8N8LC4dkjlBRCoIgdlwhMEbMQgVQW9YhByUmlzZAguuYoBCOh9i5n7rZCZAnaca0pbouDBj4Lsw8Taq6k3d2aw0y9c0H0lJOzwkGxoZAOlCt8Fk2q7Xyj5ZA340XZC80NpA8si7MkwjHNkapiRDmcRrzmZCDo4wNePlqvxOIUZCCU3SzG27EMWZBbL0ueZBwXedVNs2C4Bd4KrR89SSesBgY5yRqhaNMgSZAZCyPowh8tytFbSnRw5eXGgHZBNEZD' `
  -H 'Content-Type: application/json' `
  -d '{ \"messaging_product\": \"whatsapp\", \"to\": \"50686609841\", \"type\": \"template\", \"template\": { \"name\": \"hello_world\", \"language\": { \"code\": \"en_US\" } } }'

Payload key reference: `"messaging_product": "whatsapp"`


  
