import React from 'react'
import {inject, observer, Provider} from "mobx-react"

import {Row} from 'reactstrap';
import { SideBar } from './SideBar';
import LeftSideBar from './LeftSideBar';

import "../style/form.css";
import 'bootstrap/dist/css/bootstrap.css';
import 'font-awesome/css/font-awesome.min.css';

import io from 'socket.io-client';
import {Guesser} from './testUpdate'
import {ObservableTodoStore} from '../stores/gameStore'
import ChatBox from "./ChatBox";

// inspired by source code from lecture 2 HTML5
export const TodoList = (inject('userStore'))(observer(class TodoList extends React.Component {

    constructor(props) {
        super(props);
        this.redraw = this
            .redraw
            .bind(this);
        this.socket = io('https://localhost:3001/');
    }
    componentDidMount() {
        var self = this;
        this.socket.on('connect', function () {
            self.socket.emit('authenticate', { token: self.props.userStore.token}) //send the jwt
                .on('authenticated', function () {
                    console.log("authenticated");
                })
                .on("unauthorized", function(error, callback) {
                    console.log("unauthenticated");
                    if (error.data.type === "UnauthorizedError" || error.data.code === "invalid_token") {
                      // redirect user to login page perhaps?
                      callback();
                    }
                });
        });

        const store = this.props.store
        const canvas = this.refs.canvas
        canvas.addEventListener('mousedown', function (e) {
            var mouseX = e.pageX - this.offsetLeft;
            var mouseY = e.pageY - this.offsetTop;
            store.setPaint(true);
            store.addClick(mouseX, mouseY, false);
            self.redraw();

        });

        canvas.addEventListener('mousemove', (function (e) {
            if (store.Paint) {
                store.addClick(e.pageX - this.offsetLeft, e.pageY - this.offsetTop, true);
                self.redraw();
            }
        }));
        canvas.addEventListener('mouseup', (e) => store.setPaint(false))
        canvas.addEventListener('mouseleave', () => store.setPaint(false))
    }
    render() {
        const newStore = new ObservableTodoStore();
        return (
            <div>
                <Row>
                    <LeftSideBar/>
                    <canvas className="whiteboard" ref="canvas" width={656} height={400}/>
                    <ChatBox/>
                </Row>
                <SideBar store={this.props.store}/>
                <Provider store={newStore}>
                    <div>
                        <Guesser redraw ={this.testReDraw}/>
                    </div>
                </Provider>
            </div>

        );
    }
    redraw() {
        const canvas = this.refs.canvas
        const store = this.props.store;
        const context = canvas.getContext("2d")
        context.clearRect(0, 0, context.canvas.width, context.canvas.height); // Clears the canvas
        context.lineJoin = "round";

        for (var i = 0; i < store.getX.length; i++) {
            context.lineWidth = store.getPenWidth[i];
            if (store.dragging[i]) {
                context.beginPath();
                context.moveTo(store.getX[i - 1], store.getY[i - 1])
                context.lineTo(store.getX[i], store.getY[i]);
                context.closePath();
                context.strokeStyle = store.paintColor[i];
                context.stroke();
            }
        }
        const gameState = {
            xPos: store.getX,
            yPos: store.getY,
            color: store.getColor,
            width: store.getPenWidth,
            curWidth: store.getWidth,
            curColor: store.getCurColor,
            isPainting: store.Paint,
            dragging: store.getDrag
        }
        console.log(gameState.dragging);
        this.socket.emit('gameState', JSON.stringify(gameState));
    }
    testReDraw(ref) {
        const canvas = ref
        const store = this.props.store;
        const context = canvas.getContext("2d")
        context.clearRect(0, 0, context.canvas.width, context.canvas.height); // Clears the canvas
        context.lineJoin = "round";

        for (var i = 0; i < store.getX.length; i++) {
            context.lineWidth = store.getPenWidth[i];
            if (store.dragging[i]) {
                context.beginPath();
                context.moveTo(store.getX[i - 1], store.getY[i - 1])
                context.lineTo(store.getX[i], store.getY[i]);
                context.closePath();
                context.strokeStyle = store.paintColor[i];
                context.stroke();
            }
        }
    }
}))