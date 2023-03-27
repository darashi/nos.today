"use client";

import Query from "./Query";

export default function Search() {
  function handleSubmit(query: string) {
    console.log("Search for", query);
  }

  return (
    <>
      <Query onSubmit={handleSubmit}></Query>
    </>
  );
}
