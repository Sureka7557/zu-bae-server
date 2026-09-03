import { verifyWebhook } from "@clerk/express/webhooks";
import type { Request, Response } from "express";
import User from "../models/User.js"; // adjust path to your User model

const clerkwebhook = async (req: Request, res: Response) => {
  try {
    const evt = await verifyWebhook(req);

    const { id } = evt.data;
    const eventType = evt.type;
    console.log(`Received webhook with ID ${id} and event type of ${eventType}`);
    console.log('Webhook payload:', evt.data);

    if (evt.type === 'user.created' || evt.type === 'user.updated') {
      const user = await User.findOne({ clerkId: evt.data.id });

      const userData = {
        clerkId: evt.data.id,
        email: evt.data?.email_addresses?.[0]?.email_address,
        name: `${evt.data?.first_name ?? ''} ${evt.data?.last_name ?? ''}`.trim(),
        image: evt.data?.image_url,
      };

      if (user) {
        await User.findOneAndUpdate({ clerkId: evt.data.id }, userData);
      } else {
        await User.create(userData);
      }
    }

    return res.json({ success: true, message: "Webhook received" });
  } catch (err) {
    console.error('Error verifying webhook:', err);
    res.status(400).send('Error verifying webhook');
  }
};

export default clerkwebhook;