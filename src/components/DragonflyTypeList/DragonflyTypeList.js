import React from 'react';

const DragonflyTypeList = (props) => {
    if (!props.type){
        console.error("No props.type")
    }
    if (!props.nodes){
        console.error("No props.nodes")
    }
    if (!props.clickHandler){
        console.error("No props.clickHandler")
    }
    return (<li key={props.type}>
                    {props.type}
                    <ul>{
                        props.nodes.map(v => <li key={v.hash}
                            onClick={() => props.clickHandler(v)}>
                                {v.hash}
                        </li>)}
                    </ul>
            </li>)
}

export default DragonflyTypeList;