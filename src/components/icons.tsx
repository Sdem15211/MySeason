import { LucideProps, Loader2 } from "lucide-react";

export const Icons = {
  spinner: Loader2,
  google: (props: LucideProps) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {/* Basic Google G logo SVG path */}
      <path d="M15.05 10.25c0-.79-.07-1.54-.2-2.25h-7.8v4.26h4.44c-.19.79-.71 1.9-1.73 2.61v2.77h3.57c2.08-1.91 3.28-4.79 3.28-8.39z" />
      <path d="M7.05 21c2.3 0 4.23-.76 5.64-2.06l-3.57-2.77c-.79.53-1.8.84-2.97.84-2.28 0-4.21-1.54-4.9-3.61H.1v2.86C1.86 19.04 4.29 21 7.05 21z" />
      <path d="M2.15 13.18c-.14-.42-.22-.87-.22-1.34s.08-.92.22-1.34V7.64H.1C.03 8.3.0 9.14.0 10s.04 1.7.1 2.36l2.05.82z" />
      <path d="M7.05 5.09c1.25 0 2.37.43 3.25 1.17l3.15-3.15C11.82 1.83 9.73.91 7.05.91 4.29.91 1.86 2.96.1 5.82l2.05 2.86c.69-2.07 2.62-3.6 4.9-3.6z" />
    </svg>
  ),
};
