/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as nls from '../../../../nls.js';
import { append, $ } from '../../../../base/browser/dom.js';
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
import { asCssVariable } from '../../../../platform/theme/common/colorRegistry.js';

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
	) {
		super(options, keybindingService, contextMenuService, configurationService, contextKeyService, viewDescriptorService, instantiationService, openerService, themeService, hoverService);
	}

	override shouldShowWelcome(): boolean {
		return false;
	}

	protected override renderBody(container: HTMLElement): void {
		super.renderBody(container);

		const wrapper = append(container, $('.nocodeai-welcome-container'));
		wrapper.style.padding = '20px';
		wrapper.style.display = 'flex';
		wrapper.style.flexDirection = 'column';
		wrapper.style.gap = '8px';

		const title = append(wrapper, $('h2.nocodeai-welcome-title'));
		title.textContent = nls.localize('nocodeaiWelcomeTitle', "Welcome to NoCodeAi");
		title.style.fontSize = '18px';
		title.style.fontWeight = '600';
		title.style.color = `var(${asCssVariable('foreground')})`;
		title.style.margin = '0';

		const subtitle = append(wrapper, $('p.nocodeai-welcome-subtitle'));
		subtitle.textContent = nls.localize('nocodeaiWelcomeSubtitle', "Version 0.1");
		subtitle.style.fontSize = '13px';
		subtitle.style.color = `var(${asCssVariable('descriptionForeground')})`;
		subtitle.style.margin = '0';
	}
}
