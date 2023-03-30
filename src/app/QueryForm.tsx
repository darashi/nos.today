"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  value: string;
  onSubmit: (query: string) => void;
  onChange: (query: string) => void;
};

export default function QueryForm({ value, onSubmit, onChange }: Props) {
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    ref.current?.focus();
  }, []);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    onSubmit(value);
  }

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        ref={ref}
        placeholder="What are you looking for?"
        className="input input-bordered w-full"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={(e) => e.target.select()}
      />
    </form>
  );
}
