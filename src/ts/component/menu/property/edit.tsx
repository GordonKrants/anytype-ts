import * as React from 'react';
import { I, Util } from 'ts/lib';
import { Icon, Input } from 'ts/component';
import { commonStore } from 'ts/store';
import { observer, inject } from 'mobx-react';

interface Props extends I.Menu {};

const Constant = require('json/constant.json');

class MenuPropertyEdit extends React.Component<Props, {}> {
	
	constructor(props: any) {
		super(props);
		
		this.onType = this.onType.bind(this);
	};

	render () {
		const { param } = this.props;
		const { data } = param;
		const { properties, property } = data;
		const propertyItem = properties.find((item: any) => { return item.id == property; });
		
		let current = null;
		if (property) {
			current = (
				<div id="property-type" className={'item ' + (commonStore.menuIsOpen('propertyType') ? 'active' : '')} onClick={this.onType}>
					<Icon className={'property dark c' + propertyItem.type} />
					<div className="name">{Constant.propertyName[propertyItem.type]}</div>
					<Icon className="arrow" />
				</div>
			);
		} else {
			current = (
				<div id="property-type" className={'item ' + (commonStore.menuIsOpen('propertyType') ? 'active' : '')} onClick={this.onType}>
					<div className="name">Select type</div>
					<Icon className="arrow" />
				</div>
			);
		};
		
		return (
			<div>
				<div className="wrap">
					<Input value={propertyItem ? propertyItem.name : ''} placeHolder="Property name"  />
				</div>
				{current}
				<div className="line" />
				<div className="item">
					<Icon className="copy" />
					<div className="name">Duplicate</div>
				</div>
				<div className="item">
					<Icon className="trash" />
					<div className="name">Delete property</div>
				</div>
			</div>
		);
	};
	
	onType (e: any) {
		const { param } = this.props;
		const { data } = param;
		
		commonStore.menuOpen('propertyType', { 
			element: 'property-type',
			offsetX: 208,
			offsetY: 4,
			type: I.MenuType.Vertical,
			light: true,
			vertical: I.MenuDirection.Center,
			horizontal: I.MenuDirection.Left,
			data: {
				onSelect: (id: string) => {
					console.log('Type', id);
				},
				...data
			}
		});
	};
	
};

export default MenuPropertyEdit;