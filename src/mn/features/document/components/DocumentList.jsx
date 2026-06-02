/// <reference path="./types/DocumentList.d.ts" />

import React from 'react';
import LockIcon from '@mui/icons-material/Lock';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';

import LocaleString from '../../../components/LocaleString.jsx';

/** Displays a selectable list of persisted document names. */
export default class DocumentList extends React.Component {
	getDocuments() {
		return Array.isArray(this.props.documents) ? this.props.documents : [];
	}

	renderEmpty() {
		return (
			<div className="document-list__empty">
				<LocaleString phrase={this.props.emptyMessage || 'document.list.empty'} />
			</div>
		);
	}

	formatDate(value) {
		if (!Number.isFinite(value)) {
			return '';
		}

		return new Intl.DateTimeFormat(undefined, {
			dateStyle: 'medium',
			timeStyle: 'short',
		}).format(new Date(value));
	}

	formatSize(size) {
		if (!Number.isFinite(size)) {
			return '';
		}

		return new Intl.NumberFormat(undefined, {
			maximumFractionDigits: 1,
			style: 'unit',
			unit: 'byte',
			unitDisplay: 'narrow',
		}).format(size);
	}

	selectDocument(document) {
		this.props.onSelect?.(document);
	}

	handleDocumentKeyDown(event, document) {
		if (event.key !== 'Enter' && event.key !== ' ') {
			return;
		}

		event.preventDefault();
		this.selectDocument(document);
	}

	renderDocument(document) {
		const size = this.formatSize(document.size);
		const modifiedAt = this.formatDate(document.modifiedAt);
		const createdAt = this.formatDate(document.createdAt);
		const locked = Number.isFinite(document.lockedAt);
		const selected = document.id === this.props.selectedDocumentId;

		return (
			<TableRow
				className="document-list__row"
				hover
				key={document.id}
				onClick={() => this.selectDocument(document)}
				onKeyDown={(event) => this.handleDocumentKeyDown(event, document)}
				selected={selected}
				tabIndex={0}
			>
				<TableCell className="document-list__name-cell">
					<div className="document-list__name-row">
						<span className="document-list__name">{document.name}</span>
						{locked ? (
							<LockIcon
								className="document-list__lock"
								fontSize="small"
								titleAccess="Locked"
							/>
						) : null}
					</div>
				</TableCell>
				<TableCell className="document-list__size-cell">{size}</TableCell>
				<TableCell className="document-list__modified-cell">{modifiedAt}</TableCell>
				<TableCell className="document-list__created-cell">{createdAt}</TableCell>
			</TableRow>
		);
	}

	render() {
		const documents = this.getDocuments();

		return (
			<div className={`document-list ${this.props.className || ''}`.trim()}>
				{documents.length
					? (
						<TableContainer className="document-list__table-container">
							<Table className="document-list__table" size="small" stickyHeader>
								<TableHead>
									<TableRow>
										<TableCell>
											<LocaleString phrase="document.list.name" />
										</TableCell>
										<TableCell>
											<LocaleString phrase="document.list.size" />
										</TableCell>
										<TableCell>
											<LocaleString phrase="document.list.modified" />
										</TableCell>
										<TableCell>
											<LocaleString phrase="document.list.created" />
										</TableCell>
									</TableRow>
								</TableHead>
								<TableBody>
									{documents.map((document) => this.renderDocument(document))}
								</TableBody>
							</Table>
						</TableContainer>
					)
					: this.renderEmpty()}
			</div>
		);
	}
}
