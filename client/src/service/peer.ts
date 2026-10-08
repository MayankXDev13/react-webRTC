class PeerService {
  private _peer: RTCPeerConnection | null = null;

  get peer(): RTCPeerConnection {
    if (!this._peer) {
      this._peer = new RTCPeerConnection({
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
    return this._peer;
  }

  async getOffer(): Promise<RTCSessionDescriptionInit | undefined> {
    const offer = await this.peer.createOffer();
    await this.peer.setLocalDescription(offer);
    return offer;
  }

  async getAnswer(
    offer: RTCSessionDescriptionInit,
  ): Promise<RTCSessionDescriptionInit | undefined> {
    await this.peer.setRemoteDescription(offer);
    const answer = await this.peer.createAnswer();
    await this.peer.setLocalDescription(answer);
    return answer;
  }

  async setRemoteDescription(
    answer: RTCSessionDescriptionInit,
  ): Promise<void> {
    await this.peer.setRemoteDescription(answer);
  }

  async addIceCandidate(candidate: RTCIceCandidateInit): Promise<void> {
    try {
      await this.peer.addIceCandidate(candidate);
    } catch (error) {
      console.error("Failed to add ICE candidate", error);
    }
  }

  addTracks(stream: MediaStream): void {
    const senders = this.peer.getSenders();
    for (const track of stream.getTracks()) {
      const existingSender = senders.find((s) => s.track?.kind === track.kind);
      if (existingSender) {
        void existingSender.replaceTrack(track);
      } else {
        this.peer.addTrack(track, stream);
      }
    }
  }

  close(): void {
    this._peer?.close();
    this._peer = null;
  }
}

const peerService = new PeerService();
export default peerService;
