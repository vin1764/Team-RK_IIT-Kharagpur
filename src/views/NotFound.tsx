import { Go } from '../app/Go';

export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-start gap-4 px-4 py-16" data-testid="not-found">
      <h1 className="font-display text-3xl font-bold text-plum">Page not found</h1>
      <p className="text-grey">This address isn’t part of the prototype.</p>
      <Go to="/" next className="rounded-full bg-orange px-5 py-2 font-semibold text-ink">
        Back to the start
      </Go>
    </main>
  );
}
