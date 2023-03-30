"use client";

import Link from "next/link";

type Props = {
  onClick?: () => void;
};

export default function Navbar({ onClick }: Props) {
  return (
    <div className="navbar bg-primary text-primary-content sticky top-0 z-20">
      <div className="flex-1">
        <Link
          href="/"
          className="btn btn-ghost normal-case text-xl"
          onClick={() => onClick?.()}
        >
          nos.today
        </Link>
      </div>
      <div className="flex-none">
        <Link href="/about">
          <button className="btn btn-ghost">About</button>
        </Link>
      </div>
    </div>
  );
}
