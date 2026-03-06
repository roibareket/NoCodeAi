/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as nls from '../../../../nls.js';
import { append, $, getWindow } from '../../../../base/browser/dom.js';
import { FileAccess } from '../../../../base/common/network.js';
import { dirname } from '../../../../base/common/path.js';
import { URI } from '../../../../base/common/uri.js';
import { IViewletViewOptions } from '../../../browser/parts/views/viewsViewlet.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { IContextMenuService } from '../../../../platform/contextview/browser/contextView.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { ViewPane } from '../../../browser/parts/views/viewPane.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IViewDescriptorService } from '../../../common/views.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { ILocalizedString } from '../../../../platform/action/common/action.js';
import { IHoverService } from '../../../../platform/hover/browser/hover.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { asWebviewUri } from '../../webview/common/webview.js';
import { IWebviewService, WebviewContentPurpose } from '../../webview/browser/webview.js';

export const NOCODEAI_WELCOME_VIEW_ID = 'workbench.view.nocodeai.welcome';

export class NoCodeAiWelcomeView extends ViewPane {

	static readonly ID = NOCODEAI_WELCOME_VIEW_ID;
	static readonly NAME: ILocalizedString = nls.localize2('nocodeaiWelcome', "Welcome");

	constructor(
		options: IViewletViewOptions,
		@IThemeService themeService: IThemeService,
		@IViewDescriptorService viewDescriptorService: IViewDescriptorService,
		@IInstantiationService instantiationService: IInstantiationService,
		@IKeybindingService keybindingService: IKeybindingService,
		@IContextMenuService contextMenuService: IContextMenuService,
		@IConfigurationService configurationService: IConfigurationService,
		@IContextKeyService contextKeyService: IContextKeyService,
		@IOpenerService openerService: IOpenerService,
		@IHoverService hoverService: IHoverService,
		@IWebviewService private readonly webviewService: IWebviewService,
		@IFileService private readonly fileService: IFileService,
		@IWorkspaceContextService private readonly workspaceContextService: IWorkspaceContextService,
	) {
		super(options, keybindingService, contextMenuService, configurationService, contextKeyService, viewDescriptorService, instantiationService, openerService, themeService, hoverService);
	}

	override shouldShowWelcome(): boolean {
		return false;
	}

	protected override renderBody(container: HTMLElement): void {
		super.renderBody(container);

		container.style.position = 'relative';
		container.style.overflow = 'hidden';
		container.style.height = '100%';

		const webviewContainer = append(container, $('.nocodeai-welcome-webview'));
		webviewContainer.style.position = 'absolute';
		webviewContainer.style.inset = '0';
		webviewContainer.style.width = '100%';
		webviewContainer.style.height = '100%';
		webviewContainer.style.minHeight = '0';

		const webview = this._register(this.webviewService.createWebviewElement({
			title: 'UML Editor - visualize code',
			options: {
				purpose: WebviewContentPurpose.WebviewView,
				enableFindWidget: false,
				retainContextWhenHidden: true,
			},
			contentOptions: {
				allowScripts: true,
			},
			extension: undefined
		}));

		const targetWindow = getWindow(webviewContainer);
		webview.mountTo(webviewContainer, targetWindow);

		// UML editor page: repo at uml-editor/index.html. Try workspace paths first, then app root.
		const workspace = this.workspaceContextService.getWorkspace();
		const tryRoots: URI[] = [];
		for (const folder of workspace.folders) {
			tryRoots.push(URI.joinPath(folder.uri, 'uml-editor'));
			tryRoots.push(URI.joinPath(folder.uri, 'NoCodeAi', 'uml-editor'));
		}
		// Fallback: app root (e.g. when running from repo, dirname(FileAccess.asFileUri('').path) is repo root)
		try {
			const appRoot = URI.file(dirname(FileAccess.asFileUri('').path));
			tryRoots.push(URI.joinPath(appRoot, 'uml-editor'));
		} catch {
			// ignore
		}

		const tryLoad = (localRoot: URI) => {
			webview.localResourcesRoot = [localRoot];
			const indexUri = URI.joinPath(localRoot, 'index.html');
			return this.fileService.readFile(indexUri).then(
				({ value }) => {
					const baseUri = asWebviewUri(localRoot).toString(true);
					const baseHref = (baseUri.endsWith('/') ? baseUri : baseUri + '/')
						.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
					const html = value.toString().replace(
						/<head(\s[^>]*)?>/i,
						`$&<base href="${baseHref}">`
					);
					webview.setHtml(html);
				},
				() => Promise.reject(undefined)
			);
		};

		const showNoFileMessage = () => {
			webview.setHtml(`<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body><p>Could not load <code>uml-editor/index.html</code>. Open the NoCodeAi repository as a folder, or ensure the UML editor exists at <code>uml-editor/index.html</code>.</p></body></html>`);
		};

		if (tryRoots.length === 0) {
			webview.setHtml(`<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body><p>Open the NoCodeAi repository as a folder to view the UML editor (<code>uml-editor/index.html</code>).</p></body></html>`);
			return;
		}

		let p = tryLoad(tryRoots[0]);
		for (let i = 1; i < tryRoots.length; i++) {
			p = p.then(() => { }, () => tryLoad(tryRoots[i]));
		}
		p.then(() => { }, showNoFileMessage);
	}
}
