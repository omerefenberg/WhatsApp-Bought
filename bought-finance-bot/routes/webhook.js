const express = require('express');
const router = express.Router();
const url = require('url');

/**
 * Webhook Routes עבור WhatsApp Business API
 *
 * Meta שולחת:
 * - GET request לאימות webhook (verification)
 * - POST request עם הודעות נכנסות
 */

module.exports = (whatsappBusiness) => {
    /**
     * GET /webhook
     * אימות webhook מול Meta
     */
    router.get('/', (req, res) => {
        console.log('🔔 Webhook verification request received');
        console.log('📍 Full URL:', req.url);
        console.log('📦 Query object:', req.query);
        console.log('🔍 All query keys:', Object.keys(req.query));

        // Manual query string parsing as fallback
        const parsedUrl = url.parse(req.url, true);
        const queryParams = parsedUrl.query;

        console.log('🔧 Manually parsed query:', queryParams);

        const mode = queryParams['hub.mode'] || req.query['hub.mode'];
        const token = queryParams['hub.verify_token'] || req.query['hub.verify_token'];
        const challenge = queryParams['hub.challenge'] || req.query['hub.challenge'];

        console.log('Mode:', mode);
        console.log('Token:', token);
        console.log('Challenge:', challenge);

        const result = whatsappBusiness.verifyWebhook(mode, token, challenge);

        if (result) {
            res.status(200).send(challenge);
        } else {
            res.sendStatus(403);
        }
    });

    /**
     * POST /webhook
     * קבלת הודעות מ-WhatsApp
     */
    router.post('/', async (req, res) => {
        try {
            console.log('📥 Webhook received:', JSON.stringify(req.body, null, 2));

            // אישור קבלה מיידי ל-Meta (חובה תוך 20 שניות)
            res.sendStatus(200);

            // עיבוד ההודעה באופן אסינכרוני
            await whatsappBusiness.handleIncomingWebhook(req.body);

        } catch (error) {
            console.error('❌ Error handling webhook:', error);
            // גם במקרה של שגיאה, נחזיר 200 כדי שMeta לא ינסה שוב
            res.sendStatus(200);
        }
    });

    return router;
};
