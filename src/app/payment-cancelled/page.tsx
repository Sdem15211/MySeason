import Link from "next/link";

export default function PaymentCancelledPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 text-center">
      <h1 className="text-2xl font-semibold mb-4 text-orange-600">
        Payment Cancelled
      </h1>
      <p className="mb-6">
        Your payment process was cancelled. You have not been charged.
      </p>
      <Link
        href="/"
        className="px-6 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
      >
        Return to Homepage
      </Link>
    </main>
  );
}
