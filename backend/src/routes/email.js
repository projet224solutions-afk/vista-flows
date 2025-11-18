const express = require('express');
const router = express.Router();
const Joi = require('joi');
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.example.com',
    port: process.env.EMAIL_PORT || 587,
    secure: false,
    auth: {
        user: process.env.EMAIL_USER || 'user@example.com',
        pass: process.env.EMAIL_PASS || 'password'
    }
});

transporter.verify(function(error, success) {
    if (error) {
        console.error('❌ Failed to initialize email transporter:', error);
    } else {
        console.log('✅ Email transporter ready');
    }
});

const emailSchema = Joi.object({
    to: Joi.string().email().required(),
    subject: Joi.string().min(1).required(),
    text: Joi.string().min(1).required()
});

async function sendEmail(req, res) {
    const { error, value } = emailSchema.validate(req.body);
    if (error) {
        return res.status(400).json({ error: error.details[0].message });
    }

    const mailOptions = {
        from: process.env.EMAIL_USER || 'user@example.com',
        to: value.to,
        subject: value.subject,
        text: value.text
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        return res.status(200).json({ message: 'Email envoyé', info });
    } catch (err) {
        console.error('❌ Error sending email:', err);
        return res.status(500).json({ error: 'Impossible d’envoyer l’email' });
    }
}

router.post('/send', sendEmail);

module.exports = router;
