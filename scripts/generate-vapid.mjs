#!/usr/bin/env node
// Genera la coppia di chiavi VAPID necessaria alle notifiche push.
import webpush from 'web-push'

const { publicKey, privateKey } = webpush.generateVAPIDKeys()

console.log('\nCopia queste righe nel tuo file .env:\n')
console.log(`NEXT_PUBLIC_VAPID_PUBLIC_KEY="${publicKey}"`)
console.log(`VAPID_PRIVATE_KEY="${privateKey}"`)
console.log('VAPID_SUBJECT="mailto:tua@email.it"\n')
