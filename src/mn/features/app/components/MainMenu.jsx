import React from 'react';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import LocaleString from '../../../components/LocaleString.jsx';

/**
 * Renders the application-level command menu.
 *
 * @extends {React.Component<MainMenuProps, MainMenuState>}
 */
export default class MainMenu extends React.Component {
	constructor(props) {
		super(props);

		this.state = {
			menu: props.mainMenu?.getMenu?.() || [],
			openMenuId: '',
			anchorEl: null,
		};
	}

	componentDidMount() {
		this.subscribeToMenu();
		this.syncFromMenu();
	}

	componentDidUpdate(prevProps) {
		if (prevProps.mainMenu === this.props.mainMenu) {
			return;
		}

		this.unsubscribeFromMenu(prevProps.mainMenu);
		this.subscribeToMenu();
		this.syncFromMenu();
	}

	componentWillUnmount() {
		this.unsubscribeFromMenu();
	}

	subscribeToMenu() {
		if (!this.props.mainMenu?.listen) {
			return;
		}

		this.mainItemListener = this.props.mainMenu.listen(
			'main-item-added',
			this.onMenuUpdated.bind(this),
		);
		this.itemListener = this.props.mainMenu.listen(
			'item-added',
			this.onMenuUpdated.bind(this),
		);
	}

	unsubscribeFromMenu(mainMenu = this.props.mainMenu) {
		if (mainMenu?.unlisten && this.mainItemListener) {
			mainMenu.unlisten('main-item-added', this.mainItemListener);
		}

		if (mainMenu?.unlisten && this.itemListener) {
			mainMenu.unlisten('item-added', this.itemListener);
		}

		this.mainItemListener = null;
		this.itemListener = null;
	}

	onMenuUpdated(event) {
		this.setState({
			menu: event?.menu || this.props.mainMenu?.getMenu?.() || [],
		});
	}

	syncFromMenu() {
		this.setState({
			menu: this.props.mainMenu?.getMenu?.() || [],
		});
	}

	openMenu(menuId, event) {
		this.setState({
			openMenuId: menuId,
			anchorEl: event.currentTarget,
		});
	}

	closeMenu() {
		this.setState({
			openMenuId: '',
			anchorEl: null,
		});
	}

	selectItem(item) {
		this.props.mainMenu?.selectItem?.(item.mainMenuId, item.id);
		this.closeMenu();
	}

	renderMenuItem(item) {
		return (
			<MenuItem
				disabled={item.enabled === false}
				key={item.id}
				onClick={() => this.selectItem(item)}
			>
				<LocaleString phrase={item.stringId} />
			</MenuItem>
		);
	}

	renderSection(section, index) {
		return (
			<React.Fragment key={section.sectionNumber}>
				{index > 0 ? <Divider /> : null}
				{section.items.map((item) => this.renderMenuItem(item))}
			</React.Fragment>
		);
	}

	renderMenu(menuItem) {
		const isOpen = this.state.openMenuId === menuItem.id;

		return (
			<React.Fragment key={menuItem.id}>
				<Button
					id={`mn-main-menu-button-${menuItem.id}`}
					className="mn-main-menu__button"
					aria-controls={isOpen ? `mn-main-menu-${menuItem.id}` : undefined}
					aria-haspopup="menu"
					aria-expanded={isOpen ? 'true' : undefined}
					onClick={(event) => this.openMenu(menuItem.id, event)}
				>
					<LocaleString phrase={menuItem.stringId} />
				</Button>
				<Menu
					id={`mn-main-menu-${menuItem.id}`}
					anchorEl={this.state.anchorEl}
					open={isOpen}
					onClose={() => this.closeMenu()}
					MenuListProps={{
						'aria-labelledby': `mn-main-menu-button-${menuItem.id}`,
					}}
				>
					{menuItem.sections.length > 0
						? menuItem.sections.map((section, index) => this.renderSection(section, index))
						: (
							<MenuItem disabled>
								<LocaleString phrase="app.menu.empty" />
							</MenuItem>
						)}
				</Menu>
			</React.Fragment>
		);
	}

	render() {
		return (
			<nav className="mn-main-menu" aria-label={this.props.appTitle || 'Music Notebook'}>
				<div className="mn-main-menu__brand">{this.props.appTitle || 'Music Notebook'}</div>
				<div className="mn-main-menu__groups">
					{this.state.menu.map((menuItem) => this.renderMenu(menuItem))}
				</div>
			</nav>
		);
	}
}
