/** Props for the main menu renderer. */
type MainMenuProps = {
	/** Application title used as the visible app mark. */
	appTitle?: string;
	/** Main-menu service that supplies command groups and items. */
	mainMenu?: MainMenuService | null;
};

/** Internal main menu renderer state. */
type MainMenuState = {
	/** Current sorted menu snapshot. */
	menu: MainMenuSnapshot;
	/** Id of the top-level menu that is currently open. */
	openMenuId: string;
	/** Anchor element for the currently open MUI menu. */
	anchorEl: HTMLElement | null;
};

declare class MainMenu extends React.Component<MainMenuProps, MainMenuState> {}
