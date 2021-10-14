import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { RouteComponentProps } from 'react-router';
import { observer } from 'mobx-react';
import { Icon, IconObject, HeaderMainEdit as Header, FooterMainEdit as Footer, Loader, Block, Button, ListTemplate, ListObject, Select } from 'ts/component';
import { I, M, C, DataUtil, Util, keyboard, focus, crumbs, Action, analytics } from 'ts/lib';
import { commonStore, detailStore, dbStore, menuStore, popupStore, blockStore } from 'ts/store';
import { getRange } from 'selection-ranges';

interface Props extends RouteComponentProps<any> {
	rootId: string;
	isPopup?: boolean;
}

interface State {
	templates: any[];
}

const $ = require('jquery');
const Constant = require('json/constant.json');

const BLOCK_ID_OBJECT = 'dataview';
const BLOCK_ID_TEMPLATE = 'templates';
const EDITOR_IDS = [ 'name', 'description' ];
const NO_TEMPLATES = [ 
	Constant.typeId.page, 
	Constant.typeId.image, 
	Constant.typeId.file, 
	Constant.typeId.video, 
	Constant.typeId.type, 
	Constant.typeId.set, 
];

const PageMainType = observer(class PageMainType extends React.Component<Props, State> {

	_isMounted: boolean = false;
	id: string = '';
	refHeader: any = null;
	loading: boolean = false;
	timeout: number = 0;
	page: number = 0;

	state = {
		templates: [],
	};

	constructor (props: any) {
		super(props);
		
		this.onSelect = this.onSelect.bind(this);
		this.onUpload = this.onUpload.bind(this);
		this.onTemplateAdd = this.onTemplateAdd.bind(this);
		this.onObjectAdd = this.onObjectAdd.bind(this);
		this.onSetAdd = this.onSetAdd.bind(this);
		this.onCreate = this.onCreate.bind(this);
		this.onLayout = this.onLayout.bind(this);
	};

	render () {
		if (this.loading) {
			return <Loader id="loader" />;
		};

		const { config } = commonStore;
		const { isPopup } = this.props;
		const rootId = this.getRootId();
		const object = Util.objectCopy(detailStore.get(rootId, rootId, [ 'recommendedLayout' ]));
		const featured: any = new M.Block({ id: rootId + '-featured', type: I.BlockType.Featured, childrenIds: [], fields: {}, content: {} });
		const placeholder = {
			name: DataUtil.defaultName('type'),
			description: 'Add a description',
		};
		const type: any = dbStore.getObjectType(rootId) || {};
		const templates = dbStore.getData(rootId, BLOCK_ID_TEMPLATE);
		const { total } = dbStore.getMeta(rootId, BLOCK_ID_OBJECT);
		const layout: any = DataUtil.menuGetLayouts().find((it: any) => { return it.id == object.recommendedLayout; }) || {};

		const allowedObject = (type.types || []).indexOf(I.SmartBlockType.Page) >= 0;
		const allowedDetails = blockStore.isAllowed(rootId, rootId, [ I.RestrictionObject.Details ]);
		const allowedRelation = blockStore.isAllowed(rootId, rootId, [ I.RestrictionObject.Relation ]);
		const allowedTemplate = allowedObject;
		const showTemplates = NO_TEMPLATES.indexOf(rootId) < 0;

		if (object.name == DataUtil.defaultName('page')) {
			object.name = '';
		};

		let relations = Util.objectCopy(dbStore.getRelations(rootId, rootId));
		if (!config.debug.ho) {
			relations = relations.filter((it: any) => { return !it.isHidden; });
		};
		relations = relations.filter((it: any) => { return Constant.systemRelationKeys.indexOf(it.relationKey) < 0; });
		relations.sort(DataUtil.sortByHidden);

		const Editor = (item: any) => {
			return (
				<div className={[ 'wrap', item.className ].join(' ')}>
					{!allowedDetails ? (
						<div id={'editor-' + item.id} className={[ 'editor', 'focusable', 'c' + item.id, 'isReadonly' ].join(' ')}>
							{object[item.id]}
						</div>
					) : (
						<React.Fragment>
							<div 
								id={'editor-' + item.id}
								className={[ 'editor', 'focusable', 'c' + item.id ].join(' ')}
								contentEditable={true}
								suppressContentEditableWarning={true}
								onFocus={(e: any) => { this.onFocus(e, item); }}
								onBlur={(e: any) => { this.onBlur(e, item); }}
								onKeyDown={(e: any) => { this.onKeyDown(e, item); }}
								onKeyUp={(e: any) => { this.onKeyUp(e, item); }}
								onInput={(e: any) => { this.onInput(e, item); }}
								onSelect={(e: any) => { this.onSelectText(e, item); }}
							>
								{object[item.id]}
							</div>
							<div className={[ 'placeholder', 'c' + item.id ].join(' ')}>{placeholder[item.id]}</div>
						</React.Fragment>
					)}
				</div>
			);
		};

		const Relation = (item: any) => (
			<div id={'item-' + item.relationKey} className={[ 'item', (item.isHidden ? 'isHidden' : ''), 'canEdit' ].join(' ')}>
				<div className="clickable" onClick={(e: any) => { this.onRelationEdit(e, item.relationKey); }}>
					<Icon className={[ 'relation', DataUtil.relationClass(item.format) ].join(' ')} />
					<div className="name">{item.name}</div>
				</div>
			</div>
		);

		const ItemAdd = (item: any) => (
			<div id="item-add" className="item add" onClick={(e: any) => { this.onRelationAdd(e); }}>
				<div className="clickable">
					<Icon className="plus" />
					<div className="name">New</div>
				</div>
				<div className="value" />
			</div>
		);

		return (
			<div>
				<Header ref={(ref: any) => { this.refHeader = ref; }} {...this.props} rootId={rootId} isPopup={isPopup} />

				<div className="blocks wrapper">
					<div className="head">
						<div className="side left">
							<IconObject id={'icon-' + rootId} size={96} object={object} canEdit={allowedDetails} onSelect={this.onSelect} onUpload={this.onUpload} />
						</div>
						<div className="side center">
							<Editor className="title" id="name" />
							<Editor className="descr" id="description" />

							<Block {...this.props} key={featured.id} rootId={rootId} iconSize={20} block={featured} readonly={true} />
						</div>
						<div className="side right">
							<Button id="button-create" text="Create" onClick={this.onCreate} />
						</div>
					</div>

					{showTemplates ? (
						<div className="section template">
							<div className="title">
								{templates.length} {Util.cntWord(templates.length, 'template', 'templates')}

								{allowedTemplate ? (
									<div className="btn" onClick={this.onTemplateAdd}>
										<Icon className="plus" />New
									</div>
								) : ''}
							</div>
							{templates.length ? (
								<div className="content">
									<ListTemplate 
										key="listTemplate"
										items={templates}
										canAdd={allowedTemplate}
										onAdd={this.onTemplateAdd}
										onClick={(e: any, item: any) => { DataUtil.objectOpenPopup(item); }} 
									/>
								</div>
							) : (
								<div className="empty">
									This object type doesn't have templates
								</div>
							)}
						</div>
					) : ''}

					<div className="section note dn">
						<div className="title">Notes</div>
						<div className="content">People often distinguish between an acquaintance and a friend, holding that the former should be used primarily to refer to someone with whom one is not especially close. Many of the earliest uses of acquaintance were in fact in reference to a person with whom one was very close, but the word is now generally reserved for those who are known only slightly.</div>
					</div>

					<div className="section layout">
						<div className="title">Recommended layout</div>
						<div className="content">
							{allowedDetails ? (
								<Select 
									id="recommendedLayout" 
									value={object.recommendedLayout} 
									options={DataUtil.menuTurnLayouts()} 
									arrowClassName="light" 
									onChange={this.onLayout} 
								/>
							) : (
								<React.Fragment>
									<Icon className={layout.icon} />
									<div className="name">{layout.name}</div>
								</React.Fragment>
							)}
						</div>
					</div>

					<div className="section relation">
						<div className="title">{relations.length} {Util.cntWord(relations.length, 'relation', 'relations')}</div>
						<div className="content">
							{relations.map((item: any, i: number) => (
								<Relation key={i} {...item} />
							))}
							{allowedRelation ? <ItemAdd /> : ''}
						</div>
					</div>

					<div className="section set">
						<div className="title">{total} {Util.cntWord(total, 'object', 'objects')}</div>
						<div className="content">
							<ListObject rootId={rootId} blockId={BLOCK_ID_OBJECT} />
						</div>
					</div>
				</div>

				<Footer {...this.props} rootId={rootId} />
			</div>
		);
	};

	componentDidMount () {
		this._isMounted = true;
		this.open();
	};

	componentDidUpdate () {
		const { focused } = focus.state;
		const rootId = this.getRootId();
		const object = detailStore.get(rootId, rootId, []);

		this.open();

		for (let id of EDITOR_IDS) {
			this.placeholderCheck(id);
		};

		if (!focused && !object._empty_) {
			focus.set('name', { from: object.name.length, to: object.name.length });
		};

		window.setTimeout(() => { focus.apply(); }, 10);
	};

	componentWillUnmount () {
		const rootId = this.getRootId();
		const templates = dbStore.getData(rootId, BLOCK_ID_TEMPLATE);

		this._isMounted = false;
		this.close();

		focus.clear(true);
		window.clearTimeout(this.timeout);

		for (let item of templates) {
			Action.pageClose(item.id, false);
		};
	};

	open () {
		const { history } = this.props;
		const rootId = this.getRootId();

		if (this.id == rootId) {
			return;
		};

		this.id = rootId;
		this.loading = true;
		this.forceUpdate();

		crumbs.addPage(rootId);
		crumbs.addRecent(rootId);

		C.BlockOpen(rootId, (message: any) => {
			if (message.error.code) {
				history.push('/main/index');
				return;
			};

			this.loading = false;
			this.forceUpdate();

			if (this.refHeader) {
				this.refHeader.forceUpdate();
			};
		});
	};

	close () {
		const { isPopup, match } = this.props;
		const rootId = this.getRootId();
		
		let close = true;
		if (isPopup && (match.params.id == rootId)) {
			close = false;
		};

		if (close) {
			Action.pageClose(rootId, true);
		};
	};

	onSelect (icon: string) {
		const rootId = this.getRootId();
		DataUtil.pageSetIcon(rootId, icon, '');
	};

	onUpload (hash: string) {
		const rootId = this.getRootId();
		DataUtil.pageSetIcon(rootId, '', hash);
	};

	onTemplateAdd () {
		const rootId = this.getRootId();

		C.BlockDataviewRecordCreate(rootId, BLOCK_ID_TEMPLATE, { targetObjectType: rootId }, '', (message) => {
			if (message.error.code) {
				return;
			};

			focus.clear(true);
			dbStore.recordAdd(rootId, BLOCK_ID_TEMPLATE, message.record, 1);
			analytics.event('TemplateCreate', { objectType: rootId });
			
			window.setTimeout(() => {
				DataUtil.objectOpenPopup(message.record);
			}, 50);
		});
	};

	onCreate () {
		const rootId = this.getRootId();
		const type: any = dbStore.getObjectType(rootId) || {};
		const allowedObject = (type.types || []).indexOf(I.SmartBlockType.Page) >= 0;
		const options = [];

		if (allowedObject) {
			options.push({ id: 'object', name: 'New object' });
		};

		options.push({ id: 'set', name: 'New set of objects' });

		menuStore.open('select', { 
			element: `#button-create`,
			offsetY: 8,
			horizontal: I.MenuDirection.Center,
			data: {
				options: options,
				onSelect: (e: any, item: any) => {
					switch (item.id) {
						case 'object':
							this.onObjectAdd();
							break;

						case 'set':
							this.onSetAdd();
							break;
					};
				},
			},
		});
	};

	onObjectAdd () {
		const rootId = this.getRootId();
		const details: any = {
			type: rootId,
		};

		const create = (template: any) => {
			DataUtil.pageCreate('', '', details, I.BlockPosition.Bottom, template?.id, {}, (message: any) => {
				DataUtil.objectOpenPopup({ ...details, id: message.targetId });

				analytics.event('ObjectCreate', {
					objectType: rootId,
					layout: template?.layout,
					template: (template && template.templateIsBundled ? template.id : 'custom'),
				});
			});
		};

		const showMenu = () => {
			popupStore.open('template', {
				data: {
					typeId: rootId,
					onSelect: create,
				},
			});
		};

		DataUtil.checkTemplateCnt([ rootId ], 2, (message: any) => {
			if (message.records.length > 1) {
				showMenu();
			} else {
				create(message.records.length ? message.records[0] : '');
			};
		});
	};

	onSetAdd () {
		const rootId = this.getRootId();
		const object = detailStore.get(rootId, rootId);

		C.SetCreate([ rootId ], { name: object.name + ' set', iconEmoji: object.iconEmoji }, '', (message: any) => {
			if (!message.error.code) {
				focus.clear(true);
				DataUtil.objectOpenPopup({ id: message.id, layout: I.ObjectLayout.Set });
			};
		});
	};

	onRelationAdd (e: any) {
		const rootId = this.getRootId();
		const relations = dbStore.getRelations(rootId, rootId);

		menuStore.open('relationSuggest', { 
			element: $(e.currentTarget),
			offsetX: 32,
			data: {
				filter: '',
				rootId: rootId,
				menuIdEdit: 'blockRelationEdit',
				skipIds: relations.map((it: I.Relation) => { return it.relationKey; }),
				listCommand: (rootId: string, blockId: string, callBack?: (message: any) => void) => {
					C.ObjectRelationListAvailable(rootId, callBack);
				},
				addCommand: (rootId: string, blockId: string, relation: any) => {
					C.ObjectTypeRelationAdd(rootId, [ relation ], () => { menuStore.close('relationSuggest'); });
				},
			}
		});
	};

	onRelationEdit (e: any, relationKey: string) {
		const rootId = this.getRootId();
		const allowed = blockStore.isAllowed(rootId, rootId, [ I.RestrictionObject.Relation ]);
		
		menuStore.open('blockRelationEdit', { 
			element: $(e.currentTarget),
			horizontal: I.MenuDirection.Center,
			data: {
				rootId: rootId,
				relationKey: relationKey,
				readonly: !allowed,
				updateCommand: (rootId: string, blockId: string, relation: any) => {
					C.ObjectRelationUpdate(rootId, relation);
				},
				addCommand: (rootId: string, blockId: string, relation: any) => {
					C.ObjectTypeRelationAdd(rootId, [ relation ]);
				},
				deleteCommand: (rootId: string, blockId: string, relationKey: string) => {
					C.ObjectTypeRelationRemove(rootId, relationKey);
				},
			}
		});
	};

	onLayout (layout: string) {
		const rootId = this.getRootId();

		dbStore.objectTypeUpdate({ id: rootId, recommendedLayout: layout });
		C.BlockSetDetails(rootId, [ { key: 'recommendedLayout', value: layout } ]);
	};

	onFocus (e: any, item: any) {
		keyboard.setFocus(true);

		this.placeholderCheck(item.id);
	};

	onBlur (e: any, item: any) {
		keyboard.setFocus(false);
		window.clearTimeout(this.timeout);
		this.save();
	};

	onInput (e: any, item: any) {
		this.placeholderCheck(item.id);
	};

	onKeyDown (e: any, item: any) {
		this.placeholderCheck(item.id);

		if (item.id == 'name') {
			keyboard.shortcut('enter', e, (pressed: string) => {
				e.preventDefault();
			});
		};
	};

	onKeyUp (e: any, item: any) {
		this.placeholderCheck(item.id);

		window.clearTimeout(this.timeout);
		this.timeout = window.setTimeout(() => { this.save(); }, 500);
	};

	onSelectText (e: any, item: any) {
		focus.set(item.id, this.getRange(item.id));
	};

	save () {
		const rootId = this.getRootId();
		const details = [];
		const object: any = { id: rootId };

		for (let id of EDITOR_IDS) {
			const value = this.getValue(id);

			details.push({ key: id, value: value });
			object[id] = value;
		};
		dbStore.objectTypeUpdate(object);

		C.BlockSetDetails(rootId, details);
	};

	getRange (id: string) {
		if (!this._isMounted) {
			return;
		};

		const node = $(ReactDOM.findDOMNode(this));
		const range = getRange(node.find('#editor-' + id).get(0) as Element);
		return range ? { from: range.start, to: range.end } : null;
	};

	getValue (id: string): string {
		if (!this._isMounted) {
			return '';
		};

		const node = $(ReactDOM.findDOMNode(this));
		const value = node.find('#editor-' + id);

		return value.length ? String(value.get(0).innerText || '') : '';
	};

	placeholderCheck (id: string) {
		const value = this.getValue(id);
		value.length ? this.placeholderHide(id) : this.placeholderShow(id);			
	};

	placeholderHide (id: string) {
		if (!this._isMounted) {
			return;
		};

		const node = $(ReactDOM.findDOMNode(this));
		node.find('.placeholder.c' + id).hide();
	};
	
	placeholderShow (id: string) {
		if (!this._isMounted) {
			return;
		};

		const node = $(ReactDOM.findDOMNode(this));
		node.find('.placeholder.c' + id).show();
	};

	getRootId () {
		const { rootId, match } = this.props;
		return rootId ? rootId : match.params.id;
	};

});

export default PageMainType;