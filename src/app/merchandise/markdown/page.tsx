import { redirect } from 'next/navigation';

export default function MarkdownClearancePage() {
  redirect('/price-intel?tab=markdown');
}
