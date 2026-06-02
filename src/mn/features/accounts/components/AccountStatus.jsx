/// <reference path="./types/AccountStatus.d.ts" />

import React from 'react';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';

import Button from '../../../components/Button.jsx';
import LocaleString from '../../../components/LocaleString.jsx';

/**
 * Renders the authenticated account status and account actions in the app header.
 *
 * @extends {React.Component<AccountStatusProps, AccountStatusState>}
 */
export default class AccountStatus extends React.Component {
	constructor(props) {
		super(props);

		this.state = {
			account: this.getAccountFromProps(props),
			anchorEl: null,
		};
	}

	componentDidMount() {
		this.subscribeToAccounts();
	}

	componentDidUpdate(prevProps) {
		if (prevProps.accounts === this.props.accounts) {
			return;
		}

		this.unsubscribeFromAccounts(prevProps.accounts);
		this.subscribeToAccounts();
		this.setState({
			account: this.getAccountFromProps(this.props),
			anchorEl: null,
		});
	}

	componentWillUnmount() {
		this.unsubscribeFromAccounts();
	}

	getAccountFromProps(props) {
		return props.accounts?.getAccount?.() || null;
	}

	subscribeToAccounts() {
		if (!this.props.accounts?.listen) {
			return;
		}

		this.accountChangedListener = this.props.accounts.listen(
			'account-changed',
			this.onAccountChanged.bind(this),
		);
	}

	unsubscribeFromAccounts(accounts = this.props.accounts) {
		if (accounts?.unlisten && this.accountChangedListener) {
			accounts.unlisten('account-changed', this.accountChangedListener);
		}

		this.accountChangedListener = null;
	}

	onAccountChanged(account) {
		this.setState({
			account: account || this.getAccountFromProps(this.props),
			anchorEl: null,
		});
	}

	openUserMenu(event) {
		this.setState({anchorEl: event.currentTarget});
	}

	closeUserMenu() {
		this.setState({anchorEl: null});
	}

	openCreateAccountDialog() {
		this.props.accounts?.openCreateAccountDialog?.();
	}

	openLoginDialog() {
		this.props.accounts?.openLoginDialog?.();
	}

	logout() {
		this.closeUserMenu();
		this.props.accounts?.logout?.();
	}

	renderLoggedOut() {
		return (
			<div className="account-status account-status--logged-out">
				<Button
					className="account-status__button"
					label="accounts.menu.login"
					labelFallback="Login"
					onClick={() => this.openLoginDialog()}
				/>
				<Button
					className="account-status__button"
					label="accounts.menu.signup"
					labelFallback="Sign up"
					onClick={() => this.openCreateAccountDialog()}
					variant="primary"
				/>
			</div>
		);
	}

	renderLoggedIn() {
		const username = this.state.account?.username || '';
		const isOpen = Boolean(this.state.anchorEl);

		return (
			<div className="account-status account-status--logged-in">
				<Button
					ariaLabel="accounts.status.user_menu"
					className="account-status__user-button"
					id="account-status-user-menu-button"
					onClick={(event) => this.openUserMenu(event)}
				>
					{username}
				</Button>
				<Menu
					anchorEl={this.state.anchorEl}
					id="account-status-user-menu"
					onClose={() => this.closeUserMenu()}
					open={isOpen}
					slotProps={{
						list: {
							'aria-labelledby': 'account-status-user-menu-button',
						},
					}}
				>
					<MenuItem onClick={() => this.logout()}>
						<LocaleString phrase="accounts.menu.logout" />
					</MenuItem>
				</Menu>
			</div>
		);
	}

	render() {
		if (this.state.account) {
			return this.renderLoggedIn();
		}

		return this.renderLoggedOut();
	}
}
