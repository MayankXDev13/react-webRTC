class PeerService {
  peer?: RTCPeerConnection;

  constructor() {
    if (!this.peer) {
      this.peer = new RTCPeerConnection({
        iceServers: [
          {
            urls: [
              "stun:stun.l.google.com:19302",
              "stun:global.stun.twilio.com:3478",
            ],
          },
        ],
      });
    }
  }

  async getOffer() {
    if (!this.peer) return;

    const offer = await this.peer.createOffer();

    await this.peer.setLocalDescription(offer);

    return offer;
  }

  async getAnswer(offer: RTCSessionDescriptionInit) {
    if (!this.peer) return;

    await this.peer.setRemoteDescription(offer);

    const answer = await this.peer.createAnswer();

    await this.peer.setLocalDescription(answer);

    return answer;
  }

  async setRemoteDescription(answer: RTCSessionDescriptionInit) {
    if (!this.peer) return;

    await this.peer.setRemoteDescription(answer);
  }
}

export default new PeerService();