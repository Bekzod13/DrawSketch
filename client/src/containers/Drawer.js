import React from 'react'
import {inject, observer} from "mobx-react"
import "../style/form.css";
import {
    Row,
    Button,
    // Modal,
    // ModalHeader,
    // ModalBody,
    // ModalFooter
} from 'reactstrap';
import {SideBar} from './SideBar';
import 'bootstrap/dist/css/bootstrap.css';
import 'font-awesome/css/font-awesome.min.css';
import "../style/sidebar.css";

// inspired by source code from lecture 2 HTML5
export const Drawer = (inject('store'))(observer(class Drawer extends React.Component {

    constructor(props) {
        super(props);
        this.socket = this.props.socket;
        this.redraw = this
            .redraw
            .bind(this);
        this.beginGame = this
            .beginGame
            .bind(this);
        this.state = {
            begun: false,
            word: "",
            modal: false
        };
        this.toggle = this
            .toggle
            .bind(this);
    }
    componentDidMount() {
        this
            .props
            .store
            .updateState(JSON.stringify(this.props.game.gameState));
        this.setState({begun: this.props.game.started});
        this.redraw();
    }
    addListeners() {
        const store = this.props.store;
        const canvas = this.refs.canvas;
        var self = this;
        canvas.addEventListener('mousedown', function (e) {
            var mouseX = e.pageX - this.offsetLeft;
            var mouseY = e.pageY - this.offsetTop;
            store.setPaint(true);
            store.addClick(mouseX, mouseY, false);
            self.redraw();
            self.sendState();
        });

        // this.socket.emit()

        canvas.addEventListener('mousemove', (function (e) {
            if (store.Paint) {
                store.addClick(e.pageX - this.offsetLeft, e.pageY - this.offsetTop, true);
                self.redraw();
                self.sendState();
            }
        }));
        canvas.addEventListener('mouseup', (e) => store.setPaint(false))
        canvas.addEventListener('mouseleave', () => store.setPaint(false))
    }
    toggle() {
        this.setState({
            modal: !this.state.modal
        });
    }
    makeGuess = (guess) => {
        this
            .socket
            .emit('guess', guess)
    }
    render() {
        var beginButton = (!this.state.begun)
            ? <div className="begin-btn">
                    <Button outline onClick={this.beginGame} color="primary">
                        Begin Game
                    </Button>
                </div>
            : null;
        var myWord = (this.state.word)
            ? <p className="my-word">Your Word is {this.state.word}</p>
            : null;
        return (
            <div>

                <Row>
                    <canvas className="whiteboard" ref="canvas" width={656} height={400}/>
                </Row>
                <Row>
                    <SideBar store={this.props.store}/>
                    {beginButton}
                    {myWord}
                </Row>
            </div>
        );
    }

    beginGame() {
        if (this.props.game.players.length === 1) {
            alert("NEED MORE PLAYERS TO BEGIN")
            return;
        }
        this.addListeners();
        this
            .socket
            .emit('beginRound', JSON.stringify(this.props.game))
            .on('getWord', (word) => {
                this.setState({begun: true, modal: true, word: word})
            });
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

    }
    sendState() {
        const store = this.props.store;
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
        this
            .socket
            .emit('gameState', JSON.stringify({id: this.props.game.id, game: gameState}));
    }
}))
