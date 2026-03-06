/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { localize, localize2 } from '../../../../nls.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { SyncDescriptor } from '../../../../platform/instantiation/common/descriptors.js';
import { ViewPaneContainer } from '../../../browser/parts/views/viewPaneContainer.js';
import { Extensions as ViewContainerExtensions, IViewContainersRegistry, IViewDescriptor, IViewsRegistry, ViewContainer, ViewContainerLocation } from '../../../common/views.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { registerIcon } from '../../../../platform/theme/common/iconRegistry.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { registerWorkbenchContribution2, WorkbenchPhase } from '../../../common/contributions.js';
import { NoCodeAiWelcomeView } from './nocodeaiWelcomeView.js';
import { IWorkbenchLayoutService, Parts } from '../../../services/layout/browser/layoutService.js';
import { IPaneCompositePartService } from '../../../services/panecomposite/browser/panecomposite.js';

/** Chat view container id (from workbench.panel.chat) - we deregister it so the right sidebar shows only NoCodeAi. */
const CHAT_VIEW_CONTAINER_ID = 'workbench.panel.chat';

const NOCODEAI_VIEW_CONTAINER_ID = 'workbench.view.extension.nocodeai';
const NOCODEAI_VIEW_CONTAINER_TITLE = localize2('nocodeai', "NoCodeAi");

// Placeholder icon (Codicon). Replace with custom SVG later via icon theme or font contribution.
const nocodeaiViewIcon = registerIcon('nocodeai-view-icon', Codicon.sparkle, localize('nocodeaiViewIcon', 'NoCodeAi view container icon.'));

const viewContainerRegistry = Registry.as<IViewContainersRegistry>(ViewContainerExtensions.ViewContainersRegistry);
const viewsRegistry = Registry.as<IViewsRegistry>(ViewContainerExtensions.ViewsRegistry);

export const NOCODEAI_VIEW_CONTAINER: ViewContainer = viewContainerRegistry.registerViewContainer({
	id: NOCODEAI_VIEW_CONTAINER_ID,
	title: NOCODEAI_VIEW_CONTAINER_TITLE,
	ctorDescriptor: new SyncDescriptor(ViewPaneContainer, [NOCODEAI_VIEW_CONTAINER_ID, { mergeViewWithContainerWhenSingleView: true }]),
	icon: nocodeaiViewIcon,
	order: 100,
	hideIfEmpty: true,
	openCommandActionDescriptor: {
		id: NOCODEAI_VIEW_CONTAINER_ID,
		title: NOCODEAI_VIEW_CONTAINER_TITLE,
		mnemonicTitle: localize('miViewNoCodeAi', "NoCode&Ai"),
		order: 100
	},
}, ViewContainerLocation.AuxiliaryBar);

const welcomeViewDescriptor: IViewDescriptor = {
	id: NoCodeAiWelcomeView.ID,
	name: NoCodeAiWelcomeView.NAME,
	containerIcon: nocodeaiViewIcon,
	ctorDescriptor: new SyncDescriptor(NoCodeAiWelcomeView),
	canToggleVisibility: false,
	canMoveView: true,
	order: 0,
};

viewsRegistry.registerViews([welcomeViewDescriptor], NOCODEAI_VIEW_CONTAINER);

/**
 * Removes the Chat view container from the auxiliary bar so the right sidebar shows only the NoCodeAi (UML) HTML view.
 * Handles both Chat already registered at BlockRestore and Chat registering later (e.g. different load order).
 */
class RemoveChatFromAuxiliaryBarContribution extends Disposable {

	static readonly ID = 'workbench.contrib.nocodeai.removeChatFromAuxiliaryBar';

	constructor() {
		super();
		const registry = Registry.as<IViewContainersRegistry>(ViewContainerExtensions.ViewContainersRegistry);
		const tryRemoveChat = (viewContainer: ViewContainer, viewContainerLocation: ViewContainerLocation) => {
			if (viewContainer.id === CHAT_VIEW_CONTAINER_ID && viewContainerLocation === ViewContainerLocation.AuxiliaryBar) {
				registry.deregisterViewContainer(viewContainer);
			}
		};
		const chatContainer = registry.get(CHAT_VIEW_CONTAINER_ID);
		if (chatContainer) {
			const loc = registry.getViewContainerLocation(chatContainer);
			if (loc === ViewContainerLocation.AuxiliaryBar) {
				registry.deregisterViewContainer(chatContainer);
			}
		}
		this._register(registry.onDidRegister(({ viewContainer, viewContainerLocation }) => tryRemoveChat(viewContainer, viewContainerLocation)));
	}
}

registerWorkbenchContribution2(RemoveChatFromAuxiliaryBarContribution.ID, RemoveChatFromAuxiliaryBarContribution, WorkbenchPhase.BlockRestore);

/**
 * Keeps the secondary sidebar maximized when the NoCodeAi (UML editor) view is active and hides the maximize/restore control.
 */
class NoCodeAiAuxiliaryBarMaximizedContribution extends Disposable {

	static readonly ID = 'workbench.contrib.nocodeai.auxiliaryBarMaximized';

	constructor(
		@IWorkbenchLayoutService private readonly layoutService: IWorkbenchLayoutService,
		@IPaneCompositePartService private readonly paneCompositeService: IPaneCompositePartService,
	) {
		super();
		const ensureMaximizedWhenNoCodeAi = () => {
			if (!this.layoutService.isVisible(Parts.AUXILIARYBAR_PART)) {
				return;
			}
			const active = this.paneCompositeService.getActivePaneComposite(ViewContainerLocation.AuxiliaryBar);
			if (active?.getId() === NOCODEAI_VIEW_CONTAINER_ID && !this.layoutService.isAuxiliaryBarMaximized()) {
				this.layoutService.setAuxiliaryBarMaximized(true);
			}
		};

		this._register(this.paneCompositeService.onDidPaneCompositeOpen(e => {
			if (e.viewContainerLocation === ViewContainerLocation.AuxiliaryBar && e.composite.getId() === NOCODEAI_VIEW_CONTAINER_ID) {
				this.layoutService.setAuxiliaryBarMaximized(true);
			}
		}));

		this._register(this.layoutService.onDidChangeAuxiliaryBarMaximized(() => {
			ensureMaximizedWhenNoCodeAi();
		}));

		this._register(this.layoutService.onDidChangePartVisibility(() => {
			ensureMaximizedWhenNoCodeAi();
		}));

		// Initial state when workbench is ready
		ensureMaximizedWhenNoCodeAi();
	}
}

registerWorkbenchContribution2(NoCodeAiAuxiliaryBarMaximizedContribution.ID, NoCodeAiAuxiliaryBarMaximizedContribution, WorkbenchPhase.AfterRestored);
