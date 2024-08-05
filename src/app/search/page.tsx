import { Suspense } from "react";
import Search from "./Search";

export default function Home() {
	return (
		<main>
			<Suspense>
				<Search />
			</Suspense>
		</main>
	);
}
