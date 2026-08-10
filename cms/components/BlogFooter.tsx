export default function BlogFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto max-w-5xl px-4 py-8 text-center text-sm text-slate-500">
        <p>
          &copy; {new Date().getFullYear()} TreadLeft. Track your running shoe mileage.
        </p>
        <a
          href="https://treadleft.app"
          className="mt-1 inline-block font-medium text-brand-orange hover:underline"
        >
          treadleft.app
        </a>
      </div>
    </footer>
  );
}
