"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type Props = {
  initialValue: string;
};

export default function QueryForm({ initialValue }: Props) {
  const router = useRouter();
  const [query, setQuery] = useState(initialValue);

  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    ref.current?.focus();
  }, []);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (query === "") {
      router.push("/");
      return;
    }
    const params = new URLSearchParams();
    params.set("q", query);
    router.push("/search?" + params.toString());
  }

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        ref={ref}
        placeholder="What are you looking for?"
        className="input input-bordered w-full"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
    </form>
  );
}
