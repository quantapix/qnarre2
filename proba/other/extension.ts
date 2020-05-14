import * as vscode from 'vscode';
import { subscribeToDocumentChanges, EMOJI_MENTION } from './diagnostics';

const COMMAND = 'code-actions-sample.command';

export function activate(context: vscode.ExtensionContext) {
	context.subscriptions.push(
		vscode.languages.registerCodeActionsProvider('markdown', new Emojizer(), {
			providedCodeActionKinds: Emojizer.providedCodeActionKinds
		}));

	const emojiDiagnostics = vscode.languages.createDiagnosticCollection("emoji");
	context.subscriptions.push(emojiDiagnostics);

	subscribeToDocumentChanges(context, emojiDiagnostics);

	context.subscriptions.push(
		vscode.languages.registerCodeActionsProvider('markdown', new Emojinfo(), {
			providedCodeActionKinds: Emojinfo.providedCodeActionKinds
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand(COMMAND, () => vscode.env.openExternal(vscode.Uri.parse('https://unicode.org/emoji/charts-12.0/full-emoji-list.html')))
	);
}

/**
 * Provides code actions for converting :) to a smiley emoji.
 */
export class Emojizer implements vscode.CodeActionProvider {

	public static readonly providedCodeActionKinds = [
		vscode.CodeActionKind.QuickFix
	];

	public provideCodeActions(document: vscode.TextDocument, range: vscode.Range): vscode.CodeAction[] | undefined {
		if (!this.isAtStartOfSmiley(document, range)) {
			return;
		}

		const replaceWithSmileyCatFix = this.createFix(document, range, '😺');

		const replaceWithSmileyFix = this.createFix(document, range, '😀');
		// Marking a single fix as `preferred` means that users can apply it with a
		// single keyboard shortcut using the `Auto Fix` command.
		replaceWithSmileyFix.isPreferred = true;

		const replaceWithSmileyHankyFix = this.createFix(document, range, '💩');

		const commandAction = this.createCommand();

		return [
			replaceWithSmileyCatFix,
			replaceWithSmileyFix,
			replaceWithSmileyHankyFix,
			commandAction
		];
	}

	private isAtStartOfSmiley(document: vscode.TextDocument, range: vscode.Range) {
		const start = range.start;
		const line = document.lineAt(start.line);
		return line.text[start.character] === ':' && line.text[start.character + 1] === ')';
	}

	private createFix(document: vscode.TextDocument, range: vscode.Range, emoji: string): vscode.CodeAction {
		const fix = new vscode.CodeAction(`Convert to ${emoji}`, vscode.CodeActionKind.QuickFix);
		fix.edit = new vscode.WorkspaceEdit();
		fix.edit.replace(document.uri, new vscode.Range(range.start, range.start.translate(0, 2)), emoji);
		return fix;
	}

	private createCommand(): vscode.CodeAction {
		const action = new vscode.CodeAction('Learn more...', vscode.CodeActionKind.Empty);
		action.command = { command: COMMAND, title: 'Learn more about emojis', tooltip: 'This will open the unicode emoji page.' };
		return action;
	}
}

/**
 * Provides code actions corresponding to diagnostic problems.
 */
export class Emojinfo implements vscode.CodeActionProvider {

	public static readonly providedCodeActionKinds = [
		vscode.CodeActionKind.QuickFix
	];

	provideCodeActions(document: vscode.TextDocument, range: vscode.Range | vscode.Selection, context: vscode.CodeActionContext, token: vscode.CancellationToken): vscode.CodeAction[] {
		// for each diagnostic entry that has the matching `code`, create a code action command
		return context.diagnostics
			.filter(diagnostic => diagnostic.code === EMOJI_MENTION)
			.map(diagnostic => this.createCommandCodeAction(diagnostic));
	}

	private createCommandCodeAction(diagnostic: vscode.Diagnostic): vscode.CodeAction {
		const action = new vscode.CodeAction('Learn more...', vscode.CodeActionKind.QuickFix);
		action.command = { command: COMMAND, title: 'Learn more about emojis', tooltip: 'This will open the unicode emoji page.' };
		action.diagnostics = [diagnostic];
		action.isPreferred = true;
		return action;
	}
}


'use strict';

import * as vscode from 'vscode';

let commentId = 1;

class NoteComment implements vscode.Comment {
	id: number;
	label: string | undefined;
	constructor(
		public body: string | vscode.MarkdownString,
		public mode: vscode.CommentMode,
		public author: vscode.CommentAuthorInformation,
		public parent?: vscode.CommentThread,
		public contextValue?: string
	) {
		this.id = ++commentId;
	}
}

export function activate(context: vscode.ExtensionContext) {
	// A `CommentController` is able to provide comments for documents.
	const commentController = vscode.comments.createCommentController('comment-sample', 'Comment API Sample');
	context.subscriptions.push(commentController);

	// A `CommentingRangeProvider` controls where gutter decorations that allow adding comments are shown
	commentController.commentingRangeProvider = {
		provideCommentingRanges: (document: vscode.TextDocument, token: vscode.CancellationToken) => {
			let lineCount = document.lineCount;
			return [new vscode.Range(0, 0, lineCount - 1, 0)];
		}
	};

	context.subscriptions.push(vscode.commands.registerCommand('mywiki.createNote', (reply: vscode.CommentReply) => {
		replyNote(reply);
	}));

	context.subscriptions.push(vscode.commands.registerCommand('mywiki.replyNote', (reply: vscode.CommentReply) => {
		replyNote(reply);
	}));

	context.subscriptions.push(vscode.commands.registerCommand('mywiki.startDraft', (reply: vscode.CommentReply) => {
		let thread = reply.thread;
		thread.contextValue = 'draft';
		let newComment = new NoteComment(reply.text, vscode.CommentMode.Preview, { name: 'vscode' }, thread);
		newComment.label = 'pending';
		thread.comments = [...thread.comments, newComment];
	}));

	context.subscriptions.push(vscode.commands.registerCommand('mywiki.finishDraft', (reply: vscode.CommentReply) => {
		let thread = reply.thread;

		if (!thread) {
			return;
		}

		thread.contextValue = undefined;
		thread.collapsibleState = vscode.CommentThreadCollapsibleState.Collapsed;
		if (reply.text) {
			let newComment = new NoteComment(reply.text, vscode.CommentMode.Preview, { name: 'vscode' }, thread);
			thread.comments = [...thread.comments, newComment].map(comment => {
				comment.label = undefined;
				return comment;
			});
		}
	}));

	context.subscriptions.push(vscode.commands.registerCommand('mywiki.deleteNoteComment', (comment: NoteComment) => {
		let thread = comment.parent;
		if (!thread) {
			return;
		}

		thread.comments = thread.comments.filter(cmt => (cmt as NoteComment).id !== comment.id);

		if (thread.comments.length === 0) {
			thread.dispose();
		}
	}));

	context.subscriptions.push(vscode.commands.registerCommand('mywiki.deleteNote', (thread: vscode.CommentThread) => {
		thread.dispose();
	}));

	context.subscriptions.push(vscode.commands.registerCommand('mywiki.cancelsaveNote', (comment: NoteComment) => {
		if (!comment.parent) {
			return;
		}

		comment.parent.comments = comment.parent.comments.map(cmt => {
			if ((cmt as NoteComment).id === comment.id) {
				cmt.mode = vscode.CommentMode.Preview;
			}

			return cmt;
		});
	}));

	context.subscriptions.push(vscode.commands.registerCommand('mywiki.saveNote', (comment: NoteComment) => {
		if (!comment.parent) {
			return;
		}

		comment.parent.comments = comment.parent.comments.map(cmt => {
			if ((cmt as NoteComment).id === comment.id) {
				cmt.mode = vscode.CommentMode.Preview;
			}

			return cmt;
		});
	}));

	context.subscriptions.push(vscode.commands.registerCommand('mywiki.editNote', (comment: NoteComment) => {
		if (!comment.parent) {
			return;
		}

		comment.parent.comments = comment.parent.comments.map(cmt => {
			if ((cmt as NoteComment).id === comment.id) {
				cmt.mode = vscode.CommentMode.Editing;
			}

			return cmt;
		});
	}));

	context.subscriptions.push(vscode.commands.registerCommand('mywiki.dispose', () => {
		commentController.dispose();
	}));

	function replyNote(reply: vscode.CommentReply) {
		let thread = reply.thread;
		let newComment = new NoteComment(reply.text, vscode.CommentMode.Preview, { name: 'vscode' }, thread, thread.comments.length ? 'canDelete' : undefined);
		if (thread.contextValue === 'draft') {
			newComment.label = 'pending';
		}

		thread.comments = [...thread.comments, newComment];
	}
}


/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/

import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {

	let provider1 = vscode.languages.registerCompletionItemProvider('plaintext', {

		provideCompletionItems(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken, context: vscode.CompletionContext) {

			// a simple completion item which inserts `Hello World!`
			const simpleCompletion = new vscode.CompletionItem('Hello World!');

			// a completion item that inserts its text as snippet,
			// the `insertText`-property is a `SnippetString` which will be
			// honored by the editor.
			const snippetCompletion = new vscode.CompletionItem('Good part of the day');
			snippetCompletion.insertText = new vscode.SnippetString('Good ${1|morning,afternoon,evening|}. It is ${1}, right?');
			snippetCompletion.documentation = new vscode.MarkdownString("Inserts a snippet that lets you select the _appropriate_ part of the day for your greeting.");

			// a completion item that can be accepted by a commit character,
			// the `commitCharacters`-property is set which means that the completion will
			// be inserted and then the character will be typed.
			const commitCharacterCompletion = new vscode.CompletionItem('console');
			commitCharacterCompletion.commitCharacters = ['.'];
			commitCharacterCompletion.documentation = new vscode.MarkdownString('Press `.` to get `console.`');

			// a completion item that retriggers IntelliSense when being accepted,
			// the `command`-property is set which the editor will execute after
			// completion has been inserted. Also, the `insertText` is set so that
			// a space is inserted after `new`
			const commandCompletion = new vscode.CompletionItem('new');
			commandCompletion.kind = vscode.CompletionItemKind.Keyword;
			commandCompletion.insertText = 'new ';
			commandCompletion.command = { command: 'editor.action.triggerSuggest', title: 'Re-trigger completions...' };

			// return all completion items as array
			return [
				simpleCompletion,
				snippetCompletion,
				commitCharacterCompletion,
				commandCompletion
			];
		}
	});

	const provider2 = vscode.languages.registerCompletionItemProvider(
		'plaintext',
		{
			provideCompletionItems(document: vscode.TextDocument, position: vscode.Position) {

				// get all text until the `position` and check if it reads `console.`
				// and if so then complete if `log`, `warn`, and `error`
				let linePrefix = document.lineAt(position).text.substr(0, position.character);
				if (!linePrefix.endsWith('console.')) {
					return undefined;
				}

				return [
					new vscode.CompletionItem('log', vscode.CompletionItemKind.Method),
					new vscode.CompletionItem('warn', vscode.CompletionItemKind.Method),
					new vscode.CompletionItem('error', vscode.CompletionItemKind.Method),
				];
			}
		},
		'.' // triggered whenever a '.' is being typed
	);

	context.subscriptions.push(provider1, provider2);
}


import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {

	// Example: Reading Window scoped configuration
	const configuredView = vscode.workspace.getConfiguration().get('conf.view.showOnWindowOpen');
	switch (configuredView) {
		case 'explorer':
			vscode.commands.executeCommand('workbench.view.explorer');
			break;
		case 'search':
			vscode.commands.executeCommand('workbench.view.search');
			break;
		case 'scm':
			vscode.commands.executeCommand('workbench.view.scm');
			break;
		case 'debug':
			vscode.commands.executeCommand('workbench.view.debug');
			break;
		case 'extensions':
			vscode.commands.executeCommand('workbench.view.extensions');
			break;
	}

	// Example: Updating Window scoped configuration
	vscode.commands.registerCommand('config.commands.configureViewOnWindowOpen', async () => {

		// 1) Getting the value
		const value = await vscode.window.showQuickPick(['explorer', 'search', 'scm', 'debug', 'extensions'], { placeHolder: 'Select the view to show when opening a window.' });

		if (vscode.workspace.workspaceFolders) {

			// 2) Getting the Configuration target
			const target = await vscode.window.showQuickPick(
				[
					{ label: 'User', description: 'User Settings', target: vscode.ConfigurationTarget.Global },
					{ label: 'Workspace', description: 'Workspace Settings', target: vscode.ConfigurationTarget.Workspace }
				],
				{ placeHolder: 'Select the view to show when opening a window.' });

			if (value && target) {

				// 3) Update the configuration value in the target
				await vscode.workspace.getConfiguration().update('conf.view.showOnWindowOpen', value, target.target);

				/*
				// Default is to update in Workspace
				await vscode.workspace.getConfiguration().update('conf.view.showOnWindowOpen', value);
				*/
			}
		} else {

			// 2) Update the configuration value in User Setting in case of no workspace folders
			await vscode.workspace.getConfiguration().update('conf.view.showOnWindowOpen', value, vscode.ConfigurationTarget.Global);
		}


	});

	// Example: Reading Resource scoped configuration for a file
	context.subscriptions.push(vscode.workspace.onDidOpenTextDocument(e => {

		// 1) Get the configured glob pattern value for the current file
		const value: any = vscode.workspace.getConfiguration('', e.uri).get('conf.resource.insertEmptyLastLine');

		// 2) Check if the current resource matches the glob pattern
		const matches = value ? value[e.fileName] : undefined;

		// 3) If matches, insert empty last line
		if (matches) {
			vscode.window.showInformationMessage('An empty line will be added to the document ' + e.fileName);
		}

	}));

	// Example: Updating Resource scoped Configuration for current file
	vscode.commands.registerCommand('config.commands.configureEmptyLastLineCurrentFile', async () => {

		if (vscode.window.activeTextEditor) {
			const currentDocument = vscode.window.activeTextEditor.document;

			// 1) Get the configuration for the current document
			const configuration = vscode.workspace.getConfiguration('', currentDocument.uri);

			// 2) Get the configiuration value
			const currentValue = configuration.get('conf.resource.insertEmptyLastLine', {});

			// 3) Choose target to Global when there are no workspace folders
			const target = vscode.workspace.workspaceFolders ? vscode.ConfigurationTarget.WorkspaceFolder : vscode.ConfigurationTarget.Global;

			const value = { ...currentValue, ...{ [currentDocument.fileName]: true } };

			// 4) Update the configuration
			await configuration.update('conf.resource.insertEmptyLastLine', value, target);
		}
	});

	// Example: Updating Resource scoped Configuration
	vscode.commands.registerCommand('config.commands.configureEmptyLastLineFiles', async () => {

		// 1) Getting the value
		const value = await vscode.window.showInputBox({ prompt: 'Provide glob pattern of files to have empty last line.' });

		if (vscode.workspace.workspaceFolders) {

			// 2) Getting the target
			const target = await vscode.window.showQuickPick(
				[
					{ label: 'Application', description: 'User Settings', target: vscode.ConfigurationTarget.Global },
					{ label: 'Workspace', description: 'Workspace Settings', target: vscode.ConfigurationTarget.Workspace },
					{ label: 'Workspace Folder', description: 'Workspace Folder Settings', target: vscode.ConfigurationTarget.WorkspaceFolder }
				],
				{ placeHolder: 'Select the target to which this setting should be applied' });

			if (value && target) {

				if (target.target === vscode.ConfigurationTarget.WorkspaceFolder) {

					// 3) Getting the workspace folder
					let workspaceFolder = await vscode.window.showWorkspaceFolderPick({ placeHolder: 'Pick Workspace Folder to which this setting should be applied' });
					if (workspaceFolder) {

						// 4) Get the configuration for the workspace folder
						const configuration = vscode.workspace.getConfiguration('', workspaceFolder);

						// 5) Get the current value
						const currentValue = configuration.get('conf.resource.insertEmptyLastLine');

						const newValue = { ...currentValue, ...{ [value]: true } };

						// 6) Update the configuration value
						await configuration.update('conf.resource.insertEmptyLastLine', newValue, target.target);
					}
				} else {

					// 3) Get the configuration
					const configuration = vscode.workspace.getConfiguration();

					// 4) Get the current value
					const currentValue = configuration.get('conf.resource.insertEmptyLastLine');

					const newValue = { ...currentValue, ...(value ? { [value]: true } : {}) };

					// 3) Update the value in the target
					await vscode.workspace.getConfiguration().update('conf.resource.insertEmptyLastLine', newValue, target.target);
				}
			}
		} else {

			// 2) Get the configuration
			const configuration = vscode.workspace.getConfiguration();

			// 3) Get the current value
			const currentValue = configuration.get('conf.resource.insertEmptyLastLine');

			const newValue = { ...currentValue, ...(value ? { [value]: true } : {}) };

			// 4) Update the value in the User Settings
			await vscode.workspace.getConfiguration().update('conf.resource.insertEmptyLastLine', newValue, vscode.ConfigurationTarget.Global);
		}
	});

	let statusSizeDisposable: vscode.Disposable;
	// Example: Reading language overridable configuration for a document
	context.subscriptions.push(vscode.workspace.onDidOpenTextDocument(e => {

		if (statusSizeDisposable) {
			statusSizeDisposable.dispose();
		}

		// 1) Check if showing size is configured for current file
		const showSize: any = vscode.workspace.getConfiguration('', e).get('conf.language.showSize');

		// 3) If matches, insert empty last line
		if (showSize) {
			statusSizeDisposable = vscode.window.setStatusBarMessage(`${e.getText().length}`);
		}

	}));

	// Example: Overriding configuration value for a language
	context.subscriptions.push(vscode.commands.registerCommand('config.commands.overrideLanguageValue', async () => {

		// 1) Getting the languge id
		const languageId = await vscode.window.showInputBox({ placeHolder: 'Enter the language id' });

		// 2) Update
		vscode.workspace.getConfiguration('', { languageId }).update('conf.language.showSize', true, false, true);

	}));

	// Example: Listening to configuration changes
	context.subscriptions.push(vscode.workspace.onDidChangeConfiguration(e => {

		if (e.affectsConfiguration('conf.resource.insertEmptyLastLine')) {
			if (vscode.window.activeTextEditor) {

				const currentDocument = vscode.window.activeTextEditor.document;

				// 1) Get the configured glob pattern value for the current file
				const value: any = vscode.workspace.getConfiguration('', currentDocument.uri).get('conf.resource.insertEmptyLastLine');

				// 2) Check if the current resource matches the glob pattern
				const matches = value[currentDocument.fileName];

				// 3) If matches, insert empty last line
				if (matches) {
					vscode.window.showInformationMessage('An empty line will be added to the document ' + currentDocument.fileName);
				}
			}
		}

		// Check if a language configuration is changed for a text document
		if (e.affectsConfiguration('conf.language.showSize', vscode.window.activeTextEditor)) {

		}

		// Check if a language configuration is changed for a language
		if (e.affectsConfiguration('conf.language.showSize', { languageId: 'typescript' })) {

		}

	}));

}