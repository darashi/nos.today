"use client";

import { useState } from "react";

type Props = {
  onSubmit: (query: string) => void;
};

export default function Query({ onSubmit }: Props) {
  const [query, setQuery] = useState("");

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    onSubmit(query);
  }

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        placeholder="What are you looking for?"
        className="input input-bordered w-full"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
    </form>
  );
}
