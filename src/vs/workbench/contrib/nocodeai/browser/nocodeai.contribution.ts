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
import { NoCodeAiWelcomeView } from './nocodeaiWelcomeView.js';

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
}, ViewContainerLocation.Sidebar);

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
