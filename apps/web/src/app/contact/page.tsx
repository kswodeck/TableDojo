'use client';

import { useState, type FormEvent } from 'react';
import { ApiError, api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { TextAreaField, TextField } from '@/components/ui/field';
import { Alert, PageHeading, Panel } from '@/components/ui/surface';

export default function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [banner, setBanner] = useState<{ tone: 'win' | 'lose'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const set = (key: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((current) => ({ ...current, [key]: event.target.value }));

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setErrors({});
    setBanner(null);
    try {
      const { message } = await api.post<{ message: string }>('/api/contact', form);
      setBanner({ tone: 'win', text: message });
      setForm({ name: '', email: '', subject: '', message: '' });
    } catch (caught) {
      if (caught instanceof ApiError) {
        setErrors(caught.fieldErrors);
        setBanner({ tone: 'lose', text: caught.message });
      } else {
        setBanner({ tone: 'lose', text: 'Could not send your message. Please try again.' });
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeading
        eyebrow="Support"
        title="Get in touch"
        description="Bug reports, feature ideas, or a scoring rule you think we got wrong — all welcome."
      />

      <Panel>
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          {banner && <Alert tone={banner.tone}>{banner.text}</Alert>}

          <div className="grid gap-4 sm:grid-cols-2">
            <TextField label="Your name" value={form.name} onChange={set('name')} error={errors.name} autoComplete="name" required />
            <TextField label="Email" type="email" value={form.email} onChange={set('email')} error={errors.email} autoComplete="email" required />
          </div>

          <TextField label="Subject" value={form.subject} onChange={set('subject')} error={errors.subject} required />
          <TextAreaField
            label="Message"
            value={form.message}
            onChange={set('message')}
            error={errors.message}
            hint="At least a couple of sentences, please."
            required
          />

          <Button type="submit" disabled={busy} size="lg">
            {busy ? 'Sending…' : 'Send message'}
          </Button>
        </form>
      </Panel>
    </div>
  );
}
