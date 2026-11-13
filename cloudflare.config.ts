import { defineConfig } from "cf/config";

export default defineConfig({
	worker: {
		name: "nos-today",
		compatibilityDate: "2026-10-23",
		domains: ["nos.today"],
		workersDev: false,
		previewUrls: true,
		observability: {
			enabled: true,
		},
		assets: {
			notFoundHandling: "single-page-application",
		},
	},
});
