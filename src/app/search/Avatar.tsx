import { Content } from "nostr-typedef";

type Props = {
	pubkeyUri: string;
	profile: Content.Metadata | undefined;
};

export const Avatar = ({ pubkeyUri, profile }: Props) => {
	return (
		<div className="avatar placeholder">
			<div className={"w-14 h-14 rounded" + (profile ? "" : " bg-slate-200")}>
				<a href={pubkeyUri}>
					{profile?.picture && (
						<img
							src={profile?.picture}
							alt={profile.display_name}
							className={profile ? "" : "animate-pulse"}
						/>
					)}
				</a>
			</div>
		</div>
	);
};
