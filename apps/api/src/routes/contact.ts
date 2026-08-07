import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { env } from '../config/env.js';
import { sendMail } from '../lib/mailer.js';
import { validate } from '../middleware/validate.js';

export const contactRouter = Router();

const contactLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: { code: 'rate_limited', message: 'You have sent several messages already. Try again later.' } },
});

/**
 * Contact form.
 *
 * The old form only pretended to send: the route waited 500ms and re-rendered
 * the page with a success banner, while the actual send was attempted from the
 * browser by a third-party SMTP script. This posts through the server's mail
 * transport, and logs the message when SMTP is not configured.
 */
contactRouter.post(
  '/',
  contactLimiter,
  validate(
    z.object({
      name: z.string().trim().min(1, 'Tell us your name').max(80),
      email: z.string().trim().toLowerCase().email('Enter a valid email address').max(60),
      subject: z.string().trim().min(2, 'Add a subject').max(120),
      message: z.string().trim().min(10, 'Add a little more detail').max(5000),
    }),
  ),
  async (req, res) => {
    const { name, email, subject, message } = req.body as {
      name: string;
      email: string;
      subject: string;
      message: string;
    };

    await sendMail({
      to: env.CONTACT_TO || env.MAIL_FROM,
      subject: `[Contact] ${subject}`,
      text: `From: ${name} <${email}>\n\n${message}`,
    });

    res.json({ message: 'Thanks for getting in touch — we will reply to the address you gave.' });
  },
);
