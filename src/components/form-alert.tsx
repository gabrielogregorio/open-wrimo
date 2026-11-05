export function FormAlert({ message }: { message?: string }) {
  if (!message) {
    return null;
  }

  return (
    <p role="alert" className="rounded-sm border border-danger px-3 py-2 text-sm text-danger">
      {message}
    </p>
  );
}
