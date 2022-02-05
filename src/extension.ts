import * as vscode from 'vscode';
import { CssOrganizer } from "./css-organizer";

let cssOrganizer : CssOrganizer;

export function activate(context: vscode.ExtensionContext) {

	cssOrganizer  = new CssOrganizer(context);

	cssOrganizer.registerCmd('css-organizer.alphabetically', () => {
		cssOrganizer.organizeAlphabetically();
	});

	cssOrganizer.registerCmd('css-organizer.systematically', () => {
		cssOrganizer.organizeSystematically();
	});
}

// this method is called when your extension is deactivated
export function deactivate() {}
