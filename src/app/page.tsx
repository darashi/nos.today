import Search from "./Search";

export default function Home() {
  return (
    <main>
      <div className="navbar bg-primary text-primary-content">
        <a className="btn btn-ghost normal-case text-xl">nos.today</a>
      </div>
      <div className="container mx-auto my-10">
        <Search />
      </div>
    </main>
  );
}
