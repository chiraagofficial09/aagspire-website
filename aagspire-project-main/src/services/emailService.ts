import emailjs from '@emailjs/browser';

export interface ContactFormData {
  name: string;
  email: string;
  phone?: string;
  service: string;
  message: string;
}

export interface EmailResponse {
  success: boolean;
  error?: string;
}

const SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID?.trim() || '';
const TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID?.trim() || '';
const PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY?.trim() || '';

/**
 * Checks whether EmailJS environment variables are configured.
 */
export function isEmailConfigured(): boolean {
  return Boolean(SERVICE_ID && TEMPLATE_ID && PUBLIC_KEY);
}

/**
 * Sends a contact project inquiry email using EmailJS.
 */
export async function sendContactEmail(formData: ContactFormData): Promise<EmailResponse> {
  if (!isEmailConfigured()) {
    console.warn(
      '[EmailJS] Missing configuration. Ensure VITE_EMAILJS_SERVICE_ID, VITE_EMAILJS_TEMPLATE_ID, and VITE_EMAILJS_PUBLIC_KEY are set in your .env file.'
    );
    return {
      success: false,
      error:
        'Email service is not yet configured. Please set your EmailJS credentials in the .env file.',
    };
  }

  const templateParams: Record<string, string> = {
    // Both common EmailJS naming conventions supported:
    name: formData.name,
    from_name: formData.name,
    email: formData.email,
    from_email: formData.email,
    reply_to: formData.email,
    phone: formData.phone?.trim() ? formData.phone.trim() : 'Not provided',
    service: formData.service,
    message: formData.message,
    submission_date: new Date().toLocaleString(),
  };

  try {
    const response = await emailjs.send(SERVICE_ID, TEMPLATE_ID, templateParams, {
      publicKey: PUBLIC_KEY,
    });

    if (response.status === 200 || response.text === 'OK') {
      return { success: true };
    }

    return {
      success: false,
      error: response.text || 'Failed to send message. Please try again.',
    };
  } catch (err: unknown) {
    console.error('[EmailJS] Error sending email:', err);

    let errorDetail = 'Failed to send message. Please try again later or reach us directly at aagspire@gmail.com.';
    if (typeof err === 'object' && err !== null) {
      if ('text' in err && typeof (err as { text: unknown }).text === 'string') {
        errorDetail = (err as { text: string }).text;
      } else if ('message' in err && typeof (err as { message: unknown }).message === 'string') {
        errorDetail = (err as { message: string }).message;
      }
    }

    return {
      success: false,
      error: errorDetail,
    };
  }
}
