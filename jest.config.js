/** @type {import('jest').Config} */
module.exports = {
	testEnvironment: "node",
	roots: ["<rootDir>/tests"],
	testMatch: ["**/*.test.ts"],
	transform: {
		"^.+\\.ts$": [
			"ts-jest",
			{
				tsconfig: "tsconfig.test.json",
				diagnostics: false,
			},
		],
	},
	moduleNameMapper: {
		"^server/(.*)$": "<rootDir>/src/server/$1",
		"^shared/(.*)$": "<rootDir>/src/shared/$1",
		"^client/(.*)$": "<rootDir>/src/client/$1",
		"^@rbxts/(.*)$": "<rootDir>/tests/__mocks__/@rbxts/$1",
	},
	setupFiles: ["<rootDir>/tests/setup/roblox-globals.ts"],
};
