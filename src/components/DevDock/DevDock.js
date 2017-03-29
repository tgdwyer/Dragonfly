import {connect} from 'react-redux';
import React from 'react';

import './devDock.css';
/**
 * Import actions here
 */
import { addTriplet } from '../../actions/d3actions';

const devDock = React.createClass({
    getInitialState: function(){
        return {
            subject: "",
            predicate: "",
            object: ""
        }
    },
    render: function(){
        return <div id="devDock">
            <div>
                <div>
                    <label htmlFor="subject">Subject:</label>
                    <input id="subject" value={this.state.subject} onChange={(e) => {this.setState({subject: e.target.value})}} />
                </div>
                <div>
                    <label htmlFor="predicate">Edge:</label>
                    <input id="predicate" value={this.state.predicate} onChange={(e) => {this.setState({predicate: e.target.value})}} />
                </div>
                <div>
                    <label htmlFor="object">Object:</label>
                    <input id="object" value={this.state.object} onChange={(e) => {this.setState({object: e.target.value})}} />
                </div>
            </div>
            <button onClick={() => {this.props.addTriplet(this.state.subject, this.state.predicate, this.state.object)}}>Add Triplet</button>
        </div>
    }
});

const mapStateToProps = state => ({

});

const mapDispatchToProps = dispatch => ({
    addTriplet: (subjectHash, predicateType, objectHash) => dispatch(addTriplet(
        {hash: subjectHash}, {type: predicateType}, {hash: objectHash})),
});

export const DevDock = connect(
    mapStateToProps,
    mapDispatchToProps
)(devDock);