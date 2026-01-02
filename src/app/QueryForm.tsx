import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";

type Props = {
	initialValue: string;
};

export default function QueryForm({ initialValue }: Props) {
	const navigate = useNavigate();
	const [query, setQuery] = useState(initialValue);

	useEffect(() => {
		setQuery(initialValue);
	}, [initialValue]);

	function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		if (query === "") {
			navigate("/");
			return;
		}
		const params = new URLSearchParams();
		params.set("q", query);
		navigate(`/search?${params.toString()}`);
	}

	return (
		<form onSubmit={handleSubmit}>
			<input
				type="text"
				// biome-ignore lint/a11y/noAutofocus: User should input query immediately
				autoFocus={initialValue === ""}
				placeholder="What are you looking for?"
				className="input input-bordered w-full input-lg focus:outline-none"
				value={query}
				onChange={(e) => setQuery(e.target.value)}
			/>
		</form>
	);
}
